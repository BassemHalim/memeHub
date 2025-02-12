package server

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"log/slog"
	"mime"
	"os"
	"path/filepath"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	"github.com/google/uuid"
	"github.com/lib/pq"
)

type Server struct {
	pb.UnimplementedMemeServiceServer
	db  *sql.DB
	log *slog.Logger
}

type Meme struct {
	ID              int64
	MediaURL        string
	MediaType       string
	MediaDimensions string
	Name            string
	Tags            []string
}

func NewMemeServer(db *sql.DB, logger *slog.Logger) *Server {
	return &Server{db: db, log: logger}
}

func (s *Server) UploadMeme(ctx context.Context, req *pb.UploadMemeRequest) (*pb.MemeResponse, error) {
	
	log := s.log
	log.Debug("Uploading Meme")
	if len(req.Dimensions) != 2 {
		return nil, fmt.Errorf("Invalid image dimensions")
	}
	ext, err := mime.ExtensionsByType(req.MediaType)
	if err != nil {
		log.Debug("Invalid mime type")
		return nil, fmt.Errorf("Invalid media mime type")
	}
	filename := uuid.New().String() + ext[len(ext)-1]

	uploadDir := "images"
	cwd, err := os.Getwd()
	if err != nil {
		log.Error("Failed to get current working directory", "ERROR", err)
		return nil, fmt.Errorf("Invalid images directory")
	}
	uploadDir = filepath.Join(cwd, uploadDir)

	filePath := filepath.Join(uploadDir, filename)
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		log.Error("Failed to create memes directory", "Error", err)
		return nil, fmt.Errorf("Error creating memes directory")
	}

	if err := os.WriteFile(filePath, req.Image, 0666); err != nil {
		log.Error("Failed to save image to disk due to error", "Error", err)
		return nil, fmt.Errorf("Error saving image to disk")
	}
	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("Error saving the image metadata")
	}
	// TODO: clean up on failure (delete stored images)
	defer tx.Rollback()

	// save the meme in the database
	var memeID int64
	err = tx.QueryRow(`
		INSERT INTO meme (media_url, media_type, name, dimensions)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`, fmt.Sprintf("/imgs/%s", filename), req.MediaType, req.Name, pq.Array(req.Dimensions)).Scan(&memeID)
	if err != nil {
		log.Error("Failed to insert meme", "Error", err)
		return nil, fmt.Errorf("Error saving the image metadata")
	}

	// save the tags in the database
	for _, tagName := range req.Tags {
		var tagID int64
		err = tx.QueryRow(`
		WITH ins AS (
            INSERT INTO tag (name)
            VALUES ($1)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
            RETURNING id
        )
        SELECT id FROM ins
        UNION ALL
        SELECT id FROM tag WHERE name = $1
        LIMIT 1
		`, tagName).Scan(&tagID)
		if err != nil {
			return nil, fmt.Errorf("Error saving the tag %s", err)
		}
		// save tag in meme_tag table
		_, err = tx.Exec(`
		INSERT INTO meme_tag (meme_id, tag_id)
		VALUES ($1, $2)
		`, memeID, tagID)
		if err != nil {
			return nil, fmt.Errorf("Error saving the tag %s", err)
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("Error saving the image metadata")
	}

	// return the meme
	return &pb.MemeResponse{
		Id:        memeID,
		MediaUrl:  filePath,
		MediaType: req.MediaType,
		Tags:      req.Tags,
	}, nil
}

func (s *Server) GetMeme(ctx context.Context, req *pb.GetMemeRequest) (*pb.MemeResponse, error) {
	var resp pb.MemeResponse
	resp.Id = req.Id
	// get meme details
	var dimensions pq.Int32Array
	err := s.db.QueryRow(`
		SELECT media_url, media_type, name, dimensions
		FROM meme
		WHERE id = $1
		`, req.Id).Scan(&resp.MediaUrl, &resp.MediaType, &resp.Name, &dimensions)
	if err != nil {
		log.Println("Failed to get meme", err)
		return nil, fmt.Errorf("Error getting the meme")
	}
	resp.Dimensions = dimensions
	// get tags
	rows, err := s.db.Query(`
	SELECT t.name
	FROM tag t
	JOIN meme_tag mt ON t.id = mt.tag_id
	WHERE mt.meme_id = $1
	`, req.Id)
	if err != nil {
		log.Println("Failed to get tag", err)
		return nil, fmt.Errorf("Error getting the tag")
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var tag string
		if err = rows.Scan(&tag); err != nil {
			log.Println("Failed to get tag name", err)
			return nil, fmt.Errorf("Error getting the tag")
		}
		tags = append(tags, tag)
	}
	resp.Tags = tags
	return &resp, nil
}

// This is a LLM generated function and is disposable
func (s *Server) FilterMemesByTags(ctx context.Context, req *pb.FilterMemesByTagsRequest) (*pb.MemesResponse, error) {
	// Validate pagination parameters
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 10
	}

	// Calculate offset
	offset := (req.Page - 1) * req.PageSize

	var baseQuery string
	var countQuery string
	var rows *sql.Rows
	var err error
	var totalCount int32
	// If tags are empty, select all memes
	if len(req.Tags) == 0 {
		baseQuery = `
			SELECT m.id, m.media_url, m.media_type, m.name, m.dimensions
			FROM meme m
		`
		countQuery = `
			SELECT COUNT(*)
			FROM meme
		`
	} else if req.MatchType == pb.TagMatchType_ALL {
		baseQuery = `
				SELECT m.id, m.media_url, m.media_type, m.name, m.dimensions
				FROM meme m
				WHERE (
					SELECT COUNT(DISTINCT t.name)
					FROM meme_tag mt
					JOIN tag t ON mt.tag_id = t.id
					WHERE mt.meme_id = m.id AND t.name = ANY($1)
				) = $2
			`
		countQuery = `
				SELECT COUNT(*)
				FROM meme m
				WHERE (
					SELECT COUNT(DISTINCT t.name)
					FROM meme_tag mt
					JOIN tag t ON mt.tag_id = t.id
					WHERE mt.meme_id = m.id AND t.name = ANY($1)
				) = $2
			`
	} else {
		baseQuery = `
				SELECT DISTINCT m.id, m.media_url, m.media_type, m.name, m.dimensions
				FROM meme m
				JOIN meme_tag mt ON m.id = mt.meme_id
				JOIN tag t ON mt.tag_id = t.id
				WHERE t.name = ANY($1)
			`
		countQuery = `
				SELECT COUNT(DISTINCT m.id)
				FROM meme m
				JOIN meme_tag mt ON m.id = mt.meme_id
				JOIN tag t ON mt.tag_id = t.id
				WHERE t.name = ANY($1)
			`
	}

	// Add sorting
	switch req.SortOrder {
	case pb.SortOrder_OLDEST:
		baseQuery += " ORDER BY m.id ASC"
	case pb.SortOrder_MOST_TAGGED:
		baseQuery += ` ORDER BY (
				SELECT COUNT(*) FROM meme_tag WHERE meme_id = m.id
			) DESC`
	default: // NEWEST
		baseQuery += " ORDER BY m.id DESC"
	}

	// Add pagination
	if len(req.Tags) == 0 {
		baseQuery += " LIMIT $1 OFFSET $2"
		err = s.db.QueryRow(countQuery).Scan(&totalCount)
		if err != nil {
			return nil, fmt.Errorf("error counting memes: %v", err)
		}
		rows, err = s.db.Query(baseQuery, req.PageSize, offset)
	} else if req.MatchType == pb.TagMatchType_ALL {
		baseQuery += " LIMIT $3 OFFSET $4"
		err = s.db.QueryRow(countQuery, pq.Array(req.Tags), len(req.Tags)).Scan(&totalCount)
		if err != nil {
			return nil, fmt.Errorf("error counting memes: %v", err)
		}
		rows, err = s.db.Query(baseQuery, pq.Array(req.Tags), len(req.Tags), req.PageSize, offset)
	} else {
		baseQuery += " LIMIT $2 OFFSET $3"
		err = s.db.QueryRow(countQuery, pq.Array(req.Tags)).Scan(&totalCount)
		if err != nil {
			return nil, fmt.Errorf("error counting memes: %v", err)
		}
		rows, err = s.db.Query(baseQuery, pq.Array(req.Tags), req.PageSize, offset)
	}

	if err != nil {
		return nil, fmt.Errorf("error querying memes: %v", err)
	}
	defer rows.Close()

	// Process results
	var memes []*pb.MemeResponse
	for rows.Next() {
		meme := &pb.MemeResponse{}
		var dimensions pq.Int32Array
		err := rows.Scan(&meme.Id, &meme.MediaUrl, &meme.MediaType, &meme.Name, &dimensions)
		meme.Dimensions = dimensions
		if err != nil {
			return nil, fmt.Errorf("error scanning meme: %v", err)
		}

		// Get tags for each meme
		tagRows, err := s.db.Query(`
				SELECT t.name
				FROM tag t
				JOIN meme_tag mt ON t.id = mt.tag_id
				WHERE mt.meme_id = $1
			`, meme.Id)
		if err != nil {
			return nil, fmt.Errorf("error getting tags: %v", err)
		}
		defer tagRows.Close()

		var tags []string
		for tagRows.Next() {
			var tag string
			if err := tagRows.Scan(&tag); err != nil {
				return nil, fmt.Errorf("error scanning tag: %v", err)
			}
			tags = append(tags, tag)
		}
		meme.Tags = tags
		memes = append(memes, meme)
	}

	totalPages := (totalCount) / req.PageSize
	return &pb.MemesResponse{
		Memes:      memes,
		TotalCount: int32(totalCount),
		Page:       int32(req.Page),
		TotalPages: int32(totalPages),
	}, nil
}

func (s *Server) SearchMemes(ctx context.Context, req *pb.SearchMemesRequest) (*pb.MemesResponse, error) {
	query := req.Query
	var memes []*pb.MemeResponse

	rows, err := s.db.Query("Select id FROM search_memes($1)", query)
	if err != nil {
		return nil, fmt.Errorf("Searching memes failed %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		err := rows.Scan(
			&id,
		)
		memeResponse, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: id})
		if err != nil {
			return nil, fmt.Errorf("Failed to fetch meme Metadata %w", err)
		}

		memes = append(memes, memeResponse)
	}
	// TODO: handle pagination etc.
	return &pb.MemesResponse{
		Memes:      memes,
		TotalCount: int32(len(memes)),
		Page:       0,
		TotalPages: 0,
	}, nil
}
