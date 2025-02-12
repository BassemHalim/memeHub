package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	rateLimiter "github.com/BassemHalim/memeDB/rate-limiter/IP_ratelimiter"
	"github.com/go-playground/validator/v10"
	"google.golang.org/grpc"
)

type MemeUpload struct {
	Name      string   `json:"name" validate:"required"`
	MediaURL  string   `json:"media_url,omitempty" validate:"omitempty,url"`
	MimeType  string   `json:"mime_type,omitempty"`
	Tags      []string `json:"tags" validate:"required"`
	ImageData []byte   `json:"image,omitempty" validate:"omitempty,datauri"`
}

var validate *validator.Validate

func getMemes(memeClient pb.MemeServiceClient, log *slog.Logger) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// parse query parameters
		queryParams := r.URL.Query()
		tags := queryParams["tags"]
		query := queryParams["query"]
		log.Info("/GET memes", "Query", query)
		pageSize := 10
		if size := queryParams.Get("size"); size != "" {
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

		// parse match type
		matchType := pb.TagMatchType_ANY // default value
		if match := queryParams.Get("match"); match != "" {
			if strings.EqualFold(match, "all") {
				matchType = pb.TagMatchType_ALL
			}
		}
		// get memes from memeService
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		resp, err := memeClient.FilterMemesByTags(ctx, &pb.FilterMemesByTagsRequest{
			Tags:      tags,
			PageSize:  int32(pageSize),
			Page:      int32(page),
			SortOrder: sortOrder,
			MatchType: matchType,
		})
		if err != nil {
			log.Error("Error getting filtered memes", "ERROR", err)
			http.Error(w, "Error getting memes", http.StatusInternalServerError)
			return
		}
		// return all the sampleMemes as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)

	}
}
func uploadMeme(memeClient pb.MemeServiceClient, log *slog.Logger) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// Multipart form data
		r.ParseMultipartForm(32 << 20) // limit your max input length to 32MB

		// get the json metadata
		jsonData := r.FormValue("meme")
		var meme MemeUpload
		if err := json.Unmarshal([]byte(jsonData), &meme); err != nil {
			log.Error("Error parsing the json", "JSON", jsonData, "ERROR", err)
			http.Error(w, "Error parsing the meme data", http.StatusBadRequest)
			return
		}
		log.Debug("Uploaded meme metadata", "JSON", jsonData)

		validate = validator.New(validator.WithRequiredStructEnabled())
		err := validate.Struct(meme)
		if err != nil {
			log.Error("Invalid MemeResponse Struct :", "JSON", jsonData)
			http.Error(w, "The meme data is invalid or missing required fields", http.StatusBadRequest)
			return
		}
		log.Debug("Parsed Meme", "Meme", meme)
		// verify if mime type is for an image
		if strings.Split(meme.MimeType, "/")[0] != "image" {
			log.Debug("Invalid media type", "MimeType", meme.MimeType)
			http.Error(w, "Invalid media type", http.StatusBadRequest)
			return
		}

		var imgBuf bytes.Buffer

		// if no MediaURL is provided, then it's a file upload
		if meme.MediaURL == "" {
			log.Info("File upload")
			file, _, err := r.FormFile("image")
			if err != nil {
				log.Error("Couldn't find image in the multipart request", "ERROR", err)
				http.Error(w, "Error Reading the image", http.StatusBadRequest)
				return
			}
			defer file.Close()
			if _, err := imgBuf.ReadFrom(file); err != nil {
				log.Error("Error reading the image into butter", "ERROR", err)
				http.Error(w, "Error reading the image", http.StatusBadRequest)
				return
			}
		} else {
			// if MediaURL is provided, then it's a URL upload
			// download the image from the URL
			resp, err := http.Get(meme.MediaURL)
			if err != nil {
				log.Error("Error downloading the image", "URL", meme.MediaURL, "STATUS_CODE", resp.StatusCode)
				http.Error(w, "Error downloading the image", http.StatusBadRequest)
				return
			}
			defer resp.Body.Close()
			if _, err := imgBuf.ReadFrom(resp.Body); err != nil {
				log.Error("Error reading the image", err)
				http.Error(w, "Error reading the image", http.StatusBadRequest)
				return
			}
		}
		// get the image dimensions from imgBuf
		imgBytes := imgBuf.Bytes()
		imgReader := bytes.NewReader(imgBytes)
		imgConfig, _, err := image.DecodeConfig(imgReader)
		if err != nil {
			log.Error("Failed to decode image config Likely not an image", "Error", err, "Num_Bytes", len(imgBytes))
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
		resp, err := memeClient.UploadMeme(ctx, memeUpload)
		if err != nil {
			log.Error("Error uploading the meme to meme-service", "Error", err)
			http.Error(w, "Error uploading the meme", http.StatusInternalServerError)
			return
		}
		// return the meme ID
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)

	}
}
func searchMemes(memeClient pb.MemeServiceClient, log *slog.Logger) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Invalid Method", http.StatusBadRequest)
			return
		}
		// parse query parameters
		queryParams := r.URL.Query()
		// tags := queryParams["tags"]
		query := queryParams["query"]
		log.Debug("Search Query", "Query", query)
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		resp, err := memeClient.SearchMemes(ctx, &pb.SearchMemesRequest{
			Query:    query[0],
			Page:     0,
			PageSize: 10,
		})
		if err != nil {
			log.Debug("Failed to fetch meme from memeClient", "Error", err)
			http.Error(w, "Failed to fetch memes", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)

	}
}
func serveMedia(fs http.Handler, log *slog.Logger) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		log.Info("/imgs", "IMAGE_PATH", r.URL.Path)
		// Validate file extension
		ext := strings.ToLower(filepath.Ext(r.URL.Path))
		allowedExts := map[string]bool{
			".jpg":  true,
			".jpeg": true,
			".png":  true,
			".gif":  true,
		}

		if !allowedExts[ext] {
			http.Error(w, "Forbidden file type", http.StatusForbidden)
			return
		}

		// Serve the file
		http.StripPrefix("/imgs/", fs).ServeHTTP(w, r)
	}
}
func initGRPCClient() (pb.MemeServiceClient, error) {
	// Set up a connection to the server.
	host := os.Getenv("GRPC_HOST")
	port := os.Getenv("GRPC_PORT")
	conn, err := grpc.NewClient(fmt.Sprintf("%s:%s", host, port), grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	// create client
	client := pb.NewMemeServiceClient(conn)
	return client, nil
}

func main() {
	serverPort := 8080
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("Service", "MEME_GATEWAY")
	limiter := rateLimiter.NewRateLimiter(rateLimiter.REFILL_RATE, rateLimiter.BUCKET_SIZE)
	memeServiceClient, err := initGRPCClient()

	if err != nil {
		log.Error("failed to connect to memeService", "ERROR", err)
		return
	}
	// RequestLogger middleware logs all HTTP requests
	// requestLogger := func(next http.Handler) http.Handler {
	// 	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	// 		start := time.Now()
	// 		log.Printf("Started %s %s\n", r.Method, r.URL.Path)
	// 		next.ServeHTTP(w, r)
	// 		log.Printf("Completed %s %s in %v\n", r.Method, r.URL.Path, time.Since(start))
	// 	})
	// }
	// Enable CORS for all endpoints
	corsHandler := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusOK)
				return
			}
			next.ServeHTTP(w, r)
		})
	}

	uploadDir := "images"

	// Ensure the upload directory is relative to the current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Error("Failed to get current working directory", "ERROR", err)
		return
	}
	uploadDir = filepath.Join(cwd, uploadDir)
	fs := http.FileServer(http.Dir(uploadDir))

	// Handle all requests to /imgs

	getMemes := http.HandlerFunc(getMemes(memeServiceClient, log))
	uploadMeme := http.HandlerFunc(uploadMeme(memeServiceClient, log))
	searchMemes := http.HandlerFunc(searchMemes(memeServiceClient, log))
	serveMedia := http.HandlerFunc(serveMedia(fs, log))

	http.Handle("/api/memes", corsHandler(limiter.RateLimit(getMemes)))
	http.Handle("/api/meme", corsHandler(limiter.RateLimit(uploadMeme)))
	http.Handle("/api/memes/search", corsHandler(limiter.RateLimit(searchMemes)))
	http.Handle("/imgs/", corsHandler(limiter.RateLimit(serveMedia)))
	// Start server
	log.Info("Starting server", "PORT", serverPort)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", serverPort), nil); err != nil {
		log.Error("Failed to listen on port", "PORT", serverPort)
	}
}
