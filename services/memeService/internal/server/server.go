package server

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/BassemHalim/memeDB/memeService/internal/utils"
	pb "github.com/BassemHalim/memeDB/proto/memeService"
	"github.com/lib/pq"
)

type Server struct {
	pb.UnimplementedMemeServiceServer
	db  *sql.DB
	log *slog.Logger
}

func New(db *sql.DB, logger *slog.Logger) *Server {
	return &Server{db: db, log: logger}
}

func (s *Server) UploadMeme(ctx context.Context, req *pb.UploadMemeRequest) (*pb.MemeResponse, error) {

	log := s.log
	log.Debug("Uploading Meme")
	if len(req.Dimensions) != 2 {
		return nil, fmt.Errorf("invalid image dimensions")
	}
	ext, err := utils.MimeToExtension(req.MediaType)
	if err != nil {
		return nil, err
	}
	filename := utils.RandomUUID() + ext

	tx, err := s.db.Begin()
	if err != nil {
		return nil, fmt.Errorf("error starting a transaction")
	}
	defer tx.Rollback()
	mediaURL := fmt.Sprintf("/imgs/%s", filename)

	// save the meme in the database
	var memeID string
	err = tx.QueryRow(`
		INSERT INTO meme (media_url, media_type, name, dimensions)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, mediaURL, req.MediaType, req.Name, pq.Array(req.Dimensions)).Scan(&memeID)
	if err != nil {
		log.Error("Failed to insert meme", "Error", err)
		return nil, fmt.Errorf("error saving the image metadata")
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
			return nil, fmt.Errorf("error saving the tag %s", err)
		}
		// save tag in meme_tag table
		_, err = tx.Exec(`
		INSERT INTO meme_tag (meme_id, tag_id)
		VALUES ($1, $2)
		`, memeID, tagID)
		if err != nil {
			return nil, fmt.Errorf("error saving the tag %s", err)
		}
	}

	// save the image source
	if req.SocialMediaUrl != "" {
		s.log.Debug("Saving image source", "Source", req.SocialMediaUrl, "ID", memeID)
		if err := s.storeImageSource(ctx, tx, memeID, req.SocialMediaUrl); err != nil {
			log.Error("Failed to insert image source", "Error", err)
			return nil, fmt.Errorf("error saving the image source")
		}
	}
	// save image
	if err := utils.SaveImage(utils.UploadDir(), filename, req.Image); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, fmt.Errorf("error saving the image metadata")
	}

	// return the meme
	return &pb.MemeResponse{
		Id:        memeID,
		MediaUrl:  mediaURL,
		MediaType: req.MediaType,
		Tags:      req.Tags,
	}, nil
}

func (s *Server) storeImageSource(ctx context.Context, txn *sql.Tx, memeID string, source string) error {
	var socialMedia = "Other"
	if strings.Contains(source, "twimg.com") {
		socialMedia = "X"
	} else if strings.Contains(source, "redd.it") {
		socialMedia = "Reddit"
	} else if strings.Contains(source, "cdninstagram.com") {
		socialMedia = "Instagram"
	} else if strings.Contains(source, "fbcdn.net") {
		socialMedia = "FB"
	} else if strings.Contains(source, "pinterest.com") || strings.Contains(source, "pinimg.com") {
		socialMedia = "Pinterest"
	} else if strings.Contains(source, "linkedin.com") {
		socialMedia = "LinkedIn"
	} else if strings.Contains(source, "imgur.com") {
		socialMedia = "Imgur"
	}
	query := `INSERT INTO images (url, social_media_platform, meme_id)
			VALUES ($1, $2, $3);`
	var err error
	if txn == nil {
		_, err = s.db.ExecContext(ctx, query, source, socialMedia, memeID)
	} else {
		_, err = txn.ExecContext(ctx, query, source, socialMedia, memeID)
	}
	if err != nil {
		s.log.Error("Failed to insert image source", "Error", err)
		return fmt.Errorf("error saving the image source")
	}
	return nil
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
		s.log.Error("Failed to get meme", "Msg", err)
		return nil, fmt.Errorf("error getting the meme")
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
		s.log.Info("Failed to get tag", "Error", err)
		return nil, fmt.Errorf("error getting the tag")
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var tag string
		if err = rows.Scan(&tag); err != nil {
			s.log.Info("Failed to get tag name", "ERROR", err)
			return nil, fmt.Errorf("error getting the tag")
		}
		tags = append(tags, tag)
	}
	resp.Tags = tags
	return &resp, nil
}

// This is a LLM generated function and is disposable  NOT CURRENTLY USED
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

func (s *Server) GetTimelineMemes(ctx context.Context, req *pb.GetTimelineRequest) (*pb.MemesResponse, error) {
	// Validate pagination parameters
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 50
	}

	offset := (req.Page - 1) * req.PageSize

	// Base query without any tag filtering
	baseQuery := `
        SELECT m.id, m.media_url, m.media_type, m.name, m.dimensions
        FROM meme m
    `

	// Add timeline-specific sorting
	switch req.SortOrder {
	case pb.SortOrder_OLDEST:
		baseQuery += " ORDER BY m.created_at ASC" // Assuming created_at exists
	default: // NEWEST
		baseQuery += " ORDER BY m.created_at DESC" // Fallback to creation time
	}

	// Add pagination
	baseQuery += " LIMIT $1 OFFSET $2"

	// Get total count
	var totalCount int32
	countQuery := "SELECT COUNT(*) FROM meme"
	err := s.db.QueryRow(countQuery).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("error counting memes: %v", err)
	}

	// Execute main query
	rows, err := s.db.Query(baseQuery, req.PageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("error querying memes: %v", err)
	}
	defer rows.Close()

	// Process results
	var memes []*pb.MemeResponse
	for rows.Next() {
		meme := &pb.MemeResponse{}
		var dimensions pq.Int32Array
		if err := rows.Scan(
			&meme.Id,
			&meme.MediaUrl,
			&meme.MediaType,
			&meme.Name,
			&dimensions,
		); err != nil {
			return nil, fmt.Errorf("error scanning meme: %v", err)
		}
		meme.Dimensions = dimensions

		// Get tags (maintain existing tag loading logic)
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

	// Calculate total pages
	totalPages := totalCount / req.PageSize
	if totalCount%req.PageSize != 0 {
		totalPages++
	}

	return &pb.MemesResponse{
		Memes:      memes,
		TotalCount: totalCount,
		Page:       int32(req.Page),
		TotalPages: totalPages,
	}, nil
}

func (s *Server) SearchMemes(ctx context.Context, req *pb.SearchMemesRequest) (*pb.MemesResponse, error) {
	query := req.Query
	var memes []*pb.MemeResponse

	// Validate pagination parameters
	if req.Page < 1 {
		req.Page = 1
	}
	if req.PageSize < 1 {
		req.PageSize = 40
	}

	// Calculate offset
	offset := (req.Page - 1) * req.PageSize

	// Get total count of search results
	var totalCount int32
	err := s.db.QueryRow("SELECT COUNT(*) FROM search_memes($1)", query).Scan(&totalCount)
	if err != nil {
		return nil, fmt.Errorf("counting search results failed %w", err)
	}

	// Fetch paginated search results
	rows, err := s.db.Query("SELECT id::text FROM search_memes($1) LIMIT $2 OFFSET $3", query, req.PageSize, offset)
	if err != nil {
		return nil, fmt.Errorf("searching memes failed %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, fmt.Errorf("failed to scan meme ID %w", err)
		}

		memeResponse, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: id})
		if err != nil {
			return nil, fmt.Errorf("failed to fetch meme metadata %w", err)
		}

		memes = append(memes, memeResponse)
	}

	totalPages := (totalCount + int32(req.PageSize) - 1) / int32(req.PageSize)
	return &pb.MemesResponse{
		Memes:      memes,
		TotalCount: totalCount,
		Page:       int32(req.Page),
		TotalPages: totalPages,
	}, nil
}

// deletes the meme and it's meme-tag relations (tags are not deleted) as well as the image
func (s *Server) DeleteMeme(ctx context.Context, req *pb.DeleteMemeRequest) (*pb.DeleteMemeResponse, error) {
	txn, err := s.db.Begin()
	if err != nil {
		return &pb.DeleteMemeResponse{Success: false}, fmt.Errorf("error starting a transaction")
	}
	defer txn.Rollback()
	resp, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: req.Id})
	if err != nil {
		return &pb.DeleteMemeResponse{Success: false}, fmt.Errorf("error getting meme: %v", err)
	}
	// delete the image
	s.log.Info("Deleting image", "Image", resp)
	utils.SoftDeleteImage(utils.UploadDir(), filepath.Base(resp.MediaUrl))
	_, err = txn.Exec("DELETE FROM meme_tag WHERE meme_id = $1", req.Id)
	if err != nil {
		s.log.Error("Failed to delete meme_tag", "Error", err)
		return &pb.DeleteMemeResponse{Success: false}, fmt.Errorf("error deleting meme_tags: %v", err)
	}

	_, err = txn.Exec("DELETE FROM meme WHERE id = $1", req.Id)
	if err != nil {
		s.log.Error("Failed to delete meme", "Error", err)
		return &pb.DeleteMemeResponse{Success: false}, fmt.Errorf("error deleting meme: %v", err)
	}
	txn.Commit()
	return &pb.DeleteMemeResponse{Success: true}, nil
}

func (s *Server) SearchTags(ctx context.Context, req *pb.SearchTagsRequest) (*pb.TagsResponse, error) {
	// TODO: use text search
	query := req.Query
	limit := req.Limit
	if len(query) < 3 {
		return nil, fmt.Errorf("query must be at least 3 characters long")
	}
	if limit < 1 {
		limit = 5
	}

	var tags []string
	pattern := "%" + query + "%"
	rows, err := s.db.Query("SELECT name FROM tag WHERE name ILIKE $1 LIMIT $2", pattern, limit)
	if err != nil {
		s.log.Error("Failed to search tags", "Error", err, "pattern", pattern)
		return nil, fmt.Errorf("error searching tags: %v", err)
	}
	defer rows.Close()

	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, fmt.Errorf("error scanning tag: %v", err)
		}
		tags = append(tags, tag)
	}

	return &pb.TagsResponse{Tags: tags}, nil
}

func saveTags(ctx context.Context, memeID string, tags []string, tx *sql.Tx) error {
	// for each tag check if it already exists if not add it
	for _, tag := range tags {
		// add tag if it doesn't exist and get id
		row, err := tx.QueryContext(ctx, `
							INSERT INTO tag (name)
							VALUES ($1)
							ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
							RETURNING id;
							`, strings.TrimSpace(tag))
		if err != nil {
			return err
		}
		var tagID int64
		row.Next()
		err = row.Scan(&tagID)
		if err != nil {
			return err
		}
		row.Close()
		// add tag:id mapping would error if meme_id is invalid
		_, err = tx.ExecContext(ctx, `
				INSERT INTO meme_tag (meme_id, tag_id)
				VALUES ($1, $2)
				ON CONFLICT (meme_id, tag_id)
				DO NOTHING
				`, memeID, tagID)
		if err != nil {
			return err
		}
	}
	return nil
}

func (s *Server) AddTags(ctx context.Context, req *pb.AddTagsRequest) (*pb.AddTagsResponse, error) {
	s.log.Debug("Adding tags to meme", "ID", req.MemeId, "Tags", req.Tags)

	tx, err := s.db.Begin()
	if err != nil {
		return &pb.AddTagsResponse{Success: http.StatusInternalServerError}, err
	}
	defer tx.Rollback()
	if err := saveTags(ctx, req.MemeId, req.Tags, tx); err != nil {
		return &pb.AddTagsResponse{Success: http.StatusBadRequest}, err
	}
	tx.Commit()

	return &pb.AddTagsResponse{Success: http.StatusOK}, nil
}

func (s *Server) UpdateMeme(ctx context.Context, r *pb.UpdateMemeRequest) (*pb.UpdateMemeResponse, error) {
	s.log.Debug("Update Meme", "ID", r.Id, "Name", r.Name, "Tags", r.Tags, "Dimensions", r.Dimensions)
	txn, err := s.db.Begin()
	if err != nil {
		return &pb.UpdateMemeResponse{Success: false}, err
	}
	defer txn.Rollback()

	if r.Name != "" {
		_, err := txn.ExecContext(ctx, `UPDATE meme
				SET name = $1
				WHERE id = $2`, r.Name, r.Id)
		if err != nil {
			s.log.Debug("Failed to update name", "ERROR", err)
			return &pb.UpdateMemeResponse{Success: false}, err
		}

	}

	if len(r.Tags) > 0 {
		err := saveTags(ctx, r.Id, r.Tags, txn)
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, err
		}
	}

	if len(r.Image) > 0 {
		// will keep same image path (unless mime type changes in which case the id will remain but extension will change)
		// get meme
		meme, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: r.Id})
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, err
		}
		// get the image file name
		oldFilename := filepath.Base(meme.MediaUrl)
		newFilename := oldFilename
		oldExtension := filepath.Ext(meme.MediaType)
		newExtension, err := utils.MimeToExtension(r.MediaType)
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, err
		}

		if oldExtension != newExtension {
			newFilename = strings.Split(oldFilename, ".")[0] + newExtension
		}

		// update the DB
		mediaURL := fmt.Sprintf("/imgs/%s", newFilename)
		if _, err = txn.ExecContext(ctx, `UPDATE meme
		SET media_url = $1, 
		media_type = $2,
		dimensions = $3
		WHERE id = $4`, mediaURL, r.MediaType, pq.Array(r.Dimensions), r.Id); err != nil {
			return &pb.UpdateMemeResponse{Success: false}, err
		}

		if r.SocialMediaUrl != "" {
			s.log.Debug("Saving image source", "Source", r.SocialMediaUrl, "ID", r.Id)
			if err := s.storeImageSource(ctx, txn, r.Id, r.SocialMediaUrl); err != nil {
				s.log.Error("Failed to insert image source", "Error", err)
				return &pb.UpdateMemeResponse{Success: false}, fmt.Errorf("error saving the image source")
			}
		}

		// rename the image file name.ext to be name.ext_timestamp to keep old versions
		err = utils.RenameImage(oldFilename, fmt.Sprintf("%s_%d", oldFilename, time.Now().Unix()))
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, err
		}
		// save the image
		err = utils.SaveImage(utils.UploadDir(), newFilename, r.Image)
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, err
		}
	}
	txn.Commit()
	// TODO: should update cache but not really needed at the moment since the old image is cached on the CDN
	return &pb.UpdateMemeResponse{
			Success: true,
		},
		nil
}
