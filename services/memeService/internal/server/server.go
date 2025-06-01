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

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

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

func (s *Server) handleError(msg string, err error, code codes.Code) error {
	s.log.Error(msg, "Error", err)
	return status.Error(code, msg)
}
func (s *Server) UploadMeme(ctx context.Context, req *pb.UploadMemeRequest) (*pb.MemeResponse, error) {

	s.log.Debug("Uploading Meme")
	if len(req.Dimensions) != 2 {
		return nil, s.handleError("Invalid image dimensions", nil, codes.InvalidArgument)
	}
	ext, err := utils.MimeToExtension(req.MediaType)
	if err != nil {
		return nil, s.handleError("Invalid mime type", err, codes.InvalidArgument)
	}
	filename := utils.RandomUUID() + ext

	tx, err := s.db.Begin()
	if err != nil {
		return nil, s.handleError("Error starting transaction", err, codes.Internal)
	}
	defer tx.Rollback()
	mediaURL := fmt.Sprintf("/imgs/%s", filename)

	// save the meme in the database
	var memeID string
	err = tx.QueryRowContext(ctx, `
		INSERT INTO meme (media_url, media_type, name, dimensions)
		VALUES ($1, $2, $3, $4)
		RETURNING id::text
	`, mediaURL, req.MediaType, req.Name, pq.Array(req.Dimensions)).Scan(&memeID)
	if err != nil {
		return nil, s.handleError("Error inserting meme", err, codes.Internal)
	}

	err = saveTags(ctx, memeID, req.Tags, tx)
	if err != nil {
		return nil, err
	}

	// save the image source
	if req.SocialMediaUrl != "" {
		s.log.Debug("Saving image source", "Source", req.SocialMediaUrl, "ID", memeID)
		if err := s.storeImageSource(ctx, tx, memeID, req.SocialMediaUrl); err != nil {
			return nil, s.handleError("Error saving the image source", err, codes.Internal)
		}
	}
	// save image
	if err := utils.SaveImage(utils.UploadDir(), filename, req.Image); err != nil {
		return nil, s.handleError("Error saving the image", err, codes.Internal)
	}

	if err = tx.Commit(); err != nil {
		return nil, s.handleError("Error committing the transaction", err, codes.Internal)
	}

	// return the meme
	return &pb.MemeResponse{
		Id:        memeID,
		MediaUrl:  mediaURL,
		MediaType: req.MediaType,
		Tags:      req.Tags,
		Name:       req.Name,
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
		s.handleError("Failed to insert image source URL", err, codes.Internal)
	}
	return nil
}

func (s *Server) GetMeme(ctx context.Context, req *pb.GetMemeRequest) (*pb.MemeResponse, error) {
	var resp pb.MemeResponse
	resp.Id = req.Id
	// get meme details
	var dimensions pq.Int32Array
	err := s.db.QueryRowContext(ctx, `
		SELECT media_url, media_type, name, dimensions
		FROM meme
		WHERE id = $1
		`, req.Id).Scan(&resp.MediaUrl, &resp.MediaType, &resp.Name, &dimensions)
	if err != nil {
		return nil, s.handleError("error getting meme", err, codes.Internal)
	}
	resp.Dimensions = dimensions
	// get tags
	rows, err := s.db.QueryContext(ctx, `
	SELECT t.name
	FROM tag t
	JOIN meme_tag mt ON t.id = mt.tag_id
	WHERE mt.meme_id = $1
	`, req.Id)
	if err != nil {
		return nil, s.handleError("error getting tags", err, codes.Internal)
	}
	defer rows.Close()
	var tags []string
	for rows.Next() {
		var tag string
		if err = rows.Scan(&tag); err != nil {
			return nil, s.handleError("error scanning tag", err, codes.Internal)
		}
		tags = append(tags, tag)
	}
	resp.Tags = tags
	return &resp, nil
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
		return nil, s.handleError("error counting memes", err, codes.Internal)
	}

	// Execute main query
	rows, err := s.db.QueryContext(ctx, baseQuery, req.PageSize, offset)
	if err != nil {
		return nil, s.handleError("error querying memes", err, codes.Internal)
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
			return nil, s.handleError("error scanning meme", err, codes.Internal)
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
			return nil, s.handleError("error querying tags", err, codes.Internal)
		}
		defer tagRows.Close()

		var tags []string
		for tagRows.Next() {
			var tag string
			if err := tagRows.Scan(&tag); err != nil {
				return nil, s.handleError("error scanning tag", err, codes.Internal)
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
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM search_memes($1)", query).Scan(&totalCount)
	if err != nil {
		return nil, s.handleError("error counting memes", err, codes.Internal)
	}

	// Fetch paginated search results
	rows, err := s.db.Query("SELECT id::text FROM search_memes($1) LIMIT $2 OFFSET $3", query, req.PageSize, offset)
	if err != nil {
		return nil, s.handleError("search memes error", err, codes.Internal)
	}
	defer rows.Close()

	for rows.Next() {
		var id string
		err := rows.Scan(&id)
		if err != nil {
			return nil, s.handleError("error scanning meme ID", err, codes.Internal)
		}

		memeResponse, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: id})
		if err != nil {
			return nil, s.handleError("error getting meme", err, codes.Internal)
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
		return &pb.DeleteMemeResponse{Success: false}, s.handleError("error starting transaction", err, codes.Internal)
	}
	defer txn.Rollback()
	resp, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: req.Id})
	if err != nil {
		return &pb.DeleteMemeResponse{Success: false}, s.handleError(fmt.Sprintf("error getting meme %s likely bad ID", req.Id), err, codes.InvalidArgument)
	}
	// delete the image
	s.log.Debug("Deleting image", "Image", resp)
	utils.SoftDeleteImage(utils.UploadDir(), filepath.Base(resp.MediaUrl))
	_, err = txn.Exec("DELETE FROM meme_tag WHERE meme_id = $1", req.Id)
	if err != nil {
		return &pb.DeleteMemeResponse{Success: false}, s.handleError("error deleting meme_tag", err, codes.Internal)
	}

	_, err = txn.ExecContext(ctx, "DELETE FROM meme WHERE id = $1", req.Id)
	if err != nil {
		return &pb.DeleteMemeResponse{Success: false}, s.handleError("error deleting meme", err, codes.Internal)
	}
	txn.Commit()
	return &pb.DeleteMemeResponse{Success: true}, nil
}

func (s *Server) SearchTags(ctx context.Context, req *pb.SearchTagsRequest) (*pb.TagsResponse, error) {
	query := req.Query
	limit := req.Limit
	if len(query) < 3 {
		return nil, s.handleError("Query must be at least 3 characters long", nil, codes.Internal)
	}
	if limit < 1 {
		limit = 5
	}

	var tags []string
	pattern := "%" + query + "%"
	rows, err := s.db.QueryContext(ctx, "SELECT name FROM tag WHERE name ILIKE $1 LIMIT $2", pattern, limit)
	if err != nil {
		return nil, s.handleError("error searching tags", err, codes.Internal)
	}
	defer rows.Close()

	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return nil, s.handleError("error scanning tag", err, codes.Internal)
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
		return &pb.AddTagsResponse{Success: http.StatusInternalServerError}, s.handleError("error starting transaction", err, codes.Internal)
	}
	defer tx.Rollback()
	if err := saveTags(ctx, req.MemeId, req.Tags, tx); err != nil {
		return &pb.AddTagsResponse{Success: http.StatusBadRequest}, s.handleError("error saving tags", err, codes.Internal)
	}
	tx.Commit()

	return &pb.AddTagsResponse{Success: http.StatusOK}, nil
}

func (s *Server) UpdateMeme(ctx context.Context, r *pb.UpdateMemeRequest) (*pb.UpdateMemeResponse, error) {
	s.log.Debug("Update Meme", "ID", r.Id, "Name", r.Name, "Tags", r.Tags, "Dimensions", r.Dimensions)
	txn, err := s.db.Begin()
	if err != nil {
		return &pb.UpdateMemeResponse{Success: false}, s.handleError("error starting transaction", err, codes.Internal)
	}
	defer txn.Rollback()

	if r.Name != "" {
		_, err := txn.ExecContext(ctx, `UPDATE meme
				SET name = $1
				WHERE id = $2`, r.Name, r.Id)
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error updating meme name", err, codes.Internal)
		}
	}

	if len(r.Tags) > 0 {
		err := saveTags(ctx, r.Id, r.Tags, txn)
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error saving tags", err, codes.Internal)
		}
	}

	if len(r.Image) > 0 {
		// will always create a new filename to update cache)
		// get meme
		meme, err := s.GetMeme(ctx, &pb.GetMemeRequest{Id: r.Id})
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error getting meme bad ID", err, codes.InvalidArgument)
		}
		// get the image file name
		oldFilename := filepath.Base(meme.MediaUrl)
		newExtension, err := utils.MimeToExtension(r.MediaType)
		newFilename := utils.RandomUUID() + newExtension
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error getting new extension, Bad MediaType", err, codes.InvalidArgument)
		}

		// update the DB
		mediaURL := fmt.Sprintf("/imgs/%s", newFilename)
		if _, err = txn.ExecContext(ctx, `UPDATE meme
		SET media_url = $1, 
		media_type = $2,
		dimensions = $3
		WHERE id = $4`, mediaURL, r.MediaType, pq.Array(r.Dimensions), r.Id); err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error updating meme", err, codes.Internal)
		}

		if r.SocialMediaUrl != "" {
			s.log.Debug("Saving image source", "Source", r.SocialMediaUrl, "ID", r.Id)
			if err := s.storeImageSource(ctx, txn, r.Id, r.SocialMediaUrl); err != nil {
				return &pb.UpdateMemeResponse{Success: false}, s.handleError("error saving the image source", err, codes.Internal)
			}
		}

		// rename the image file name.ext to be name.ext_timestamp to keep old versions
		err = utils.RenameImage(oldFilename, fmt.Sprintf("%s_%d", oldFilename, time.Now().Unix()))
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error renaming image", err, codes.Internal)
		}
		// save the image
		err = utils.SaveImage(utils.UploadDir(), newFilename, r.Image)
		if err != nil {
			return &pb.UpdateMemeResponse{Success: false}, s.handleError("error saving the image", err, codes.Internal)
		}
	}
	txn.Commit()
	return &pb.UpdateMemeResponse{
			Success: true,
		},
		nil
}
