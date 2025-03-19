package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"

	// _ "code.google.com/p/vp8-go/webp" using a webp image isn't great outside of browsers so I will not accept webp for now (will convert to jpeg later)

	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/patrickmn/go-cache"

	"github.com/BassemHalim/memeDB/gateway/internal/config"
	"github.com/BassemHalim/memeDB/gateway/internal/meme"
	pb "github.com/BassemHalim/memeDB/proto/memeService"
	rateLimiter "github.com/BassemHalim/memeDB/rate-limiter/IP_ratelimiter"
	"github.com/go-playground/validator/v10"
)

type Server struct {
	config          *config.Config
	RateLimiter     *rateLimiter.RateLimiter
	structValidator *validator.Validate
	memeClient      pb.MemeServiceClient
	log             *slog.Logger
	client          *http.Client
	cache           *cache.Cache
}

func New(memeClient pb.MemeServiceClient, config *config.Config, rateLimiter *rateLimiter.RateLimiter, log *slog.Logger, client *http.Client, cache *cache.Cache) (*Server, error) {

	return &Server{config: config,
		RateLimiter:     rateLimiter,
		structValidator: validator.New(validator.WithRequiredStructEnabled()),
		memeClient:      memeClient,
		log:             log,
		client:          client,
		cache:           cache,
	}, nil
}

// GET /api/memes
// Endpoint to get memes for timeline and provide sort order
func (s *Server) GetTimeline(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// parse query parameters
	queryParams := r.URL.Query()

	pageSize := 10
	if size := queryParams.Get("pageSize"); size != "" {
		if parsedSize, err := strconv.Atoi(size); err == nil && parsedSize > 0 {
			pageSize = parsedSize
		}
	}
	page := 1
	if p := queryParams.Get("page"); p != "" {
		if parsedPage, err := strconv.Atoi(p); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}
	// parse sort order
	sortOrder := pb.SortOrder_NEWEST // default value
	if order := queryParams.Get("sort"); order != "" {
		if strings.EqualFold(order, "oldest") {
			sortOrder = pb.SortOrder_OLDEST
		}
	}
	timelineCacheKey := fmt.Sprintf("timeline_%d_%d", page, pageSize) // TODO: fixme different page sizes will create duplicate entries in the cache
	// check if in cache
	cachedTimeline, found := s.cache.Get(timelineCacheKey)
	if found {
		s.log.Debug("Cache hit for timeline")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(cachedTimeline)
		return

	}
	// get timeline memes
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	resp, err := s.memeClient.GetTimelineMemes(ctx, &pb.GetTimelineRequest{
		Page:      int32(page),
		PageSize:  int32(pageSize),
		SortOrder: sortOrder,
	})
	if err != nil {
		s.log.Error("Error getting filtered memes", "ERROR", err)
		http.Error(w, "Error getting memes", http.StatusInternalServerError)
		return
	}
	// store in cache
	s.cache.Set(timelineCacheKey, resp, cache.DefaultExpiration)
	// return all the sampleMemes as JSON
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)

}

// POST /api/meme
func (s *Server) UploadMeme(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// Multipart form data
	r.ParseMultipartForm(s.config.MaxUploadSize) // limit your max input length to 2MB

	// get the json metadata
	jsonData := r.FormValue("meme")
	var meme meme.UploadRequest
	if err := json.Unmarshal([]byte(jsonData), &meme); err != nil {
		s.log.Error("Error parsing the json", "JSON", jsonData, "ERROR", err)
		http.Error(w, "Error parsing the meme data", http.StatusBadRequest)
		return
	}
	s.log.Debug("Uploaded meme metadata", "JSON", jsonData)

	err := s.structValidator.Struct(meme)
	if err != nil {
		s.log.Error("Invalid MemeResponse Struct :", "JSON", jsonData)
		http.Error(w, "The meme data is invalid or missing required fields", http.StatusBadRequest)
		return
	}
	s.log.Debug("Parsed Meme", "Meme", meme)
	// verify if mime type is for an image
	if strings.Split(meme.MimeType, "/")[0] != "image" {
		s.log.Debug("Invalid media type", "MimeType", meme.MimeType)
		http.Error(w, "Invalid media type", http.StatusBadRequest)
		return
	}

	var imgBuf bytes.Buffer

	// if no MediaURL is provided, then it's a file upload
	if meme.MediaURL == "" {
		s.log.Info("File upload")
		file, _, err := r.FormFile("image")
		if err != nil {
			s.log.Error("Couldn't find image in the multipart request", "ERROR", err)
			http.Error(w, "Error Reading the image", http.StatusBadRequest)
			return
		}
		defer file.Close()
		if _, err := imgBuf.ReadFrom(file); err != nil {
			s.log.Error("Error reading the image into butter", "ERROR", err)
			http.Error(w, "Error reading the image", http.StatusBadRequest)
			return
		}
	} else {
		// if MediaURL is provided, then it's a URL upload
		// download the image from the URL

		memeURL := meme.MediaURL
		if !s.ValidateUploadURL(memeURL) {
			s.log.Error("Invalid meme url or too big", "URL", memeURL, "IP", r.RemoteAddr)
			http.Error(w, "Invalid media URL or file is too big files should be <2MB", http.StatusBadRequest)
			return
		}

		resp, err := http.Get(meme.MediaURL)
		if err != nil {
			s.log.Error("Error downloading the image", "URL", meme.MediaURL, "STATUS_CODE", resp.StatusCode)
			http.Error(w, "Error downloading the image", http.StatusBadRequest)
			return
		}
		defer resp.Body.Close()
		if _, err := imgBuf.ReadFrom(resp.Body); err != nil {
			s.log.Error("Error reading the image", "Error", err)
			http.Error(w, "Error reading the image", http.StatusBadRequest)
			return
		}
	}
	// get the image dimensions from imgBuf
	imgBytes := imgBuf.Bytes()
	if len(imgBytes) > int(s.config.MaxUploadSize) {
		s.log.Error("Uploaded file is too big", "Size", len(imgBytes))
		http.Error(w, "Uploaded image is too big", http.StatusRequestEntityTooLarge)
		return
	}
	imgReader := bytes.NewReader(imgBytes)
	imgConfig, _, err := image.DecodeConfig(imgReader)
	if err != nil {
		s.log.Error("Failed to decode image config Likely not an image", "Error", err, "Num_Bytes", len(imgBytes))
		http.Error(w, "Error reading the image", http.StatusBadRequest)
		return
	}
	// call the memeService to upload the meme
	memeUpload := &pb.UploadMemeRequest{
		MediaType:  meme.MimeType,
		Image:      imgBytes,
		Tags:       meme.Tags,
		Name:       meme.Name,
		Dimensions: []int32{int32(imgConfig.Width), int32(imgConfig.Height)},
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	resp, err := s.memeClient.UploadMeme(ctx, memeUpload)
	// TODO: resize it
	if err != nil {
		s.log.Error("Error uploading the meme to meme-service", "Error", err)
		http.Error(w, "Error uploading the meme", http.StatusInternalServerError)
		return
	}
	// return the meme ID
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)

}

// api/memes/search?query=query&page=num&pageSize=num
func (s *Server) SearchMemes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid Method", http.StatusBadRequest)
		return
	}
	// parse query parameters
	queryParams := r.URL.Query()
	// tags := queryParams["tags"]
	query := queryParams["query"]
	page, err := strconv.Atoi(queryParams.Get("page"))
	if err != nil {
		s.log.Debug("Failed to parse page query param")
		page = 1
	}
	pageSize, err := strconv.Atoi(queryParams.Get("pageSize"))
	if err != nil {
		s.log.Debug("Failed to parse pageSize query param")
		pageSize = 10
	}
	s.log.Debug("Search Query", "Query", query, "page", page, "pageSize", pageSize)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	resp, err := s.memeClient.SearchMemes(ctx, &pb.SearchMemesRequest{
		Query:    query[0],
		Page:     int32(page),
		PageSize: int32(pageSize),
	})
	if err != nil {
		s.log.Debug("Failed to fetch meme from memeClient", "Error", err)
		http.Error(w, "Failed to fetch memes", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)

}

// GET /api/tags/search?query=tagname&limit=num
func (s *Server) SearchTags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid Method", http.StatusBadRequest)
		return
	}
	// parse query parameters
	queryParams := r.URL.Query()
	query := queryParams.Get("query")
	limit := queryParams.Get("limit")
	if len(query) < 3 {
		http.Error(w, "Invalid query parameters", http.StatusBadRequest)
		return
	}
	if len(limit) == 0 {
		limit = "5"
	}
	limitVal, err := strconv.Atoi(limit)
	if err != nil {
		s.log.Debug("Failed to parse limit", "Limit", limit)
		http.Error(w, "Invalid limit", http.StatusBadRequest)
		return
	}

	searchTagsCacheKey := fmt.Sprintf("tags_%s_%d", query, limitVal)
	// check if in cache
	if cachedTags, found := s.cache.Get(searchTagsCacheKey); found {
		s.log.Debug("Cache hit for tags", "Query", query, "Limit", limit)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(cachedTags)
		return
	}
	s.log.Debug("Search Tags", "Query", query, "Limit", limit)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	resp, err := s.memeClient.SearchTags(ctx, &pb.SearchTagsRequest{
		Query: query,
		Limit: int32(limitVal),
	})
	if err != nil {
		s.log.Debug("Failed to fetch tags from memeClient", "Error", err)
		http.Error(w, "Failed to fetch tags", http.StatusInternalServerError)
		return
	}
	// store in cache
	s.cache.Set(searchTagsCacheKey, resp, cache.DefaultExpiration)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// DELETE /api/meme/{id}
func (s *Server) DeleteMeme(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Invalid Method", http.StatusBadRequest)
		return
	}
	// parse query parameters
	idString := r.PathValue("id")
	if err := uuid.Validate(idString); err != nil {
		http.Error(w, "Invalid Method", http.StatusBadRequest)
		return
	}

	s.log.Info("Delete Meme", "ID", idString)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	_, err := s.memeClient.DeleteMeme(ctx, &pb.DeleteMemeRequest{
		Id: idString,
	})
	if err != nil {
		s.log.Debug("Failed to delete meme", "Error", err)
		http.Error(w, "Failed to delete meme", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
}

// GET /api/meme/{id}
func (s *Server) GetMeme(w http.ResponseWriter, r *http.Request) {
	s.log.Debug("GET /api/meme/id", "Request", r.Method+r.URL.Path)
	if r.Method != http.MethodGet {
		http.Error(w, "Invalid Method", http.StatusBadRequest)
		return
	}
	// parse query parameters
	idString := r.PathValue("id")
	if err := uuid.Validate(idString); err != nil {
		s.log.Debug("Bad ID", "ID", idString, "Error", err)
		http.Error(w, "Bad ID", http.StatusBadRequest)
		return
	}
	memeCacheKey := fmt.Sprintf("meme_%s", idString)
	if cachedMeme, found:= s.cache.Get(memeCacheKey); found {
		s.log.Debug("Cache hit for meme", "ID", idString)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(cachedMeme)
		return
	}

	s.log.Info("Get Meme", "ID", idString)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	resp, err := s.memeClient.GetMeme(ctx, &pb.GetMemeRequest{
		Id: idString,
	})
	if err != nil {
		s.log.Debug("Failed to Get meme", "Error", err)
		http.Error(w, "Failed to Get meme", http.StatusInternalServerError)
		return
	}
	// store in cache
	s.cache.Set(memeCacheKey, resp, cache.DefaultExpiration)
	
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

func (s *Server) UpdateTags(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPatch {
		http.Error(w, "Invalid Method", http.StatusBadRequest)
		return
	}
	id := r.PathValue("id")
	if err := uuid.Validate(id); err != nil {
		s.log.Debug("Bad ID", "ID", id, "Error", err)
		http.Error(w, "Bad ID", http.StatusBadRequest)
		return
	}
	dec := json.NewDecoder(r.Body)
	var tagsRequest = meme.AddTagsRequest{}
	err := dec.Decode(&tagsRequest)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	err = s.structValidator.Struct(tagsRequest)
	if err != nil {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	s.log.Info("Adding tags to meme", "ID", id, "Tags", tagsRequest.Tags)
	resp, err := s.memeClient.AddTags(ctx, &pb.AddTagsRequest{
		MemeId: id,
		Tags:   tagsRequest.Tags,
	})
	if err != nil {
		s.log.Error("Failed to add tags", "ERROR", err)
		w.WriteHeader(http.StatusInternalServerError)
		return
	}
	if resp.Success != int32(200) {
		w.WriteHeader(int(resp.Success))
		return
	}

	w.WriteHeader(http.StatusOK)

}
