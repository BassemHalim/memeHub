package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"bytes"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log/slog"
	"net/http"
	"net/url"
	"path/filepath"
	"strconv"
	"time"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	rateLimiter "github.com/BassemHalim/memeDB/rate-limiter/IP_ratelimiter"
	"github.com/go-playground/validator/v10"
	"golang.org/x/time/rate"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type MemeUpload struct {
	Name      string   `json:"name" validate:"required"`
	MediaURL  string   `json:"media_url,omitempty" validate:"omitempty,url"`
	MimeType  string   `json:"mime_type,omitempty"`
	Tags      []string `json:"tags" validate:"required"`
	ImageData []byte   `json:"image,omitempty" validate:"omitempty,datauri"`
}

type Config struct {
	WhitelistedDomains []string `json:"whitelisted_domains"`
}

var validate *validator.Validate

const MAX_FILE_SIZE = 2 * 1024 * 1024

var whitelisted_domains map[string]bool

// loads config from 'config.json'
func loadConfig() error {
	data, err := os.ReadFile("config.json")
	if err != nil {
		return fmt.Errorf("error reading config file: %v", err)
	}

	var config Config
	if err := json.Unmarshal(data, &config); err != nil {
		return fmt.Errorf("error parsing config: %v", err)
	}

	// Initialize the whitelist map
	whitelisted_domains = make(map[string]bool)

	// Add all domains to the whitelist
	for _, domain := range config.WhitelistedDomains {
		whitelisted_domains[domain] = true
	}

	return nil
}

// returns true if the provided url is whitelisted to download from
func isWhitelisted(domain *url.URL) bool {

	host := domain.Host
	for whitelisted := range whitelisted_domains {
		if strings.HasSuffix(host, whitelisted) {
			return true
		}
	}
	return false
}

// validates that the provided url is a valid image with size < 2MB
// data is validated with HEAD request so you should still re-validate the result
func validateImageContent(url string) bool {
	client := &http.Client{
		Timeout: 2 * time.Second,
	}
	// Check MIME type via HEAD
	resp, err := client.Head(url)
	if err != nil || resp.StatusCode != 200 {
		return false
	}

	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		return false
	}

	sizeBytes := resp.Header.Get("Content-Length")
	if size, err := strconv.Atoi(sizeBytes); err != nil || size > MAX_FILE_SIZE {
		return false
	}
	return true
}

// validates provided url to make sure it is
// 1. a valid url
// 2. uses https
// 3. is from a whitelisted domain
// 4. file size is < MAX_FILE_SIZE (uses a HEAD request not GET)
// 5. file mime type is image
func memeURLValid(memeURL string) bool {
	parsed, err := url.Parse(memeURL)
	if err != nil {
		return false
	}
	if parsed.Scheme != "https" {
		return false
	}
	if !isWhitelisted(parsed) {
		return false
	}
	if !validateImageContent(memeURL) {
		return false
	}
	return true
}

// Endpoint to get memes for timeline and provide sort order
func getMemesTimeline(memeClient pb.MemeServiceClient, log *slog.Logger) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
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

		// get timeline memes
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		resp, err := memeClient.GetTimelineMemes(ctx, &pb.GetTimelineRequest{
			Page:      int32(page),
			PageSize:  int32(pageSize),
			SortOrder: sortOrder,
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
		r.ParseMultipartForm(MAX_FILE_SIZE) // limit your max input length to 2MB

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

			memeURL := meme.MediaURL
			if !memeURLValid(memeURL) {
				log.Error("Invalid meme url", "URL", memeURL, "IP", r.RemoteAddr)
				http.Error(w, "Invalid media URL", http.StatusBadRequest)
				return
			}

			resp, err := http.Get(meme.MediaURL)
			if err != nil {
				log.Error("Error downloading the image", "URL", meme.MediaURL, "STATUS_CODE", resp.StatusCode)
				http.Error(w, "Error downloading the image", http.StatusBadRequest)
				return
			}
			defer resp.Body.Close()
			if _, err := imgBuf.ReadFrom(resp.Body); err != nil {
				log.Error("Error reading the image", "Error", err)
				http.Error(w, "Error reading the image", http.StatusBadRequest)
				return
			}
		}
		// get the image dimensions from imgBuf
		imgBytes := imgBuf.Bytes()
		if len(imgBytes) > MAX_FILE_SIZE {
			log.Error("Uploaded file is too big", "Size", len(imgBytes))
			http.Error(w, "Uploaded image is too big", http.StatusRequestEntityTooLarge)
			return
		}
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
		// TODO: resize it
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
		page, err := strconv.Atoi(queryParams.Get("page"))
		if err != nil {
			log.Debug("Failed to parse page query param")
			page = 1
		}
		pageSize, err := strconv.Atoi(queryParams.Get("pageSize"))
		if err != nil {
			log.Debug("Failed to parse pageSize query param")
			pageSize = 10
		}
		log.Debug("Search Query", "Query", query, "page", page, "pageSize", pageSize)
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		resp, err := memeClient.SearchMemes(ctx, &pb.SearchMemesRequest{
			Query:    query[0],
			Page:     int32(page),
			PageSize: int32(pageSize),
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
	conn, err := grpc.NewClient(fmt.Sprintf("%s:%s", host, port), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	// create client
	client := pb.NewMemeServiceClient(conn)
	return client, nil
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	serverPort := 8080
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("Service", "MEME_GATEWAY")
	// TODO: move all config to config.json file
	requestRate, err := strconv.Atoi(getEnvOrDefault("TOKEN_RATE", strconv.Itoa(rateLimiter.TOKEN_RATE)))
	if err != nil {
		log.Error("Failed to parse TOKEN_LIMIT env")
	}
	burstRate, err := strconv.Atoi(getEnvOrDefault("TOKEN_BURST", strconv.Itoa(rateLimiter.TOKEN_RATE)))
	if err != nil {
		log.Error("Failed to parse TOKEN_BURST) env")
	}
	limiter := rateLimiter.NewRateLimiter(rate.Limit(requestRate), burstRate)
	log.Info("Rate Limiter", "RATE", requestRate, "BURST", burstRate)

	err = loadConfig()
	if err != nil {
		log.Error("Failed to load config file", "Error", err)
	}
	log.Info("Whitelisted Domains", "Domains", whitelisted_domains)

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

	getMemesTimeline := http.HandlerFunc(getMemesTimeline(memeServiceClient, log))
	uploadMeme := http.HandlerFunc(uploadMeme(memeServiceClient, log))
	searchMemes := http.HandlerFunc(searchMemes(memeServiceClient, log))
	serveMedia := http.HandlerFunc(serveMedia(fs, log))

	http.Handle("/api/memes", corsHandler(limiter.RateLimit(getMemesTimeline)))
	http.Handle("/api/meme", corsHandler(limiter.RateLimit(uploadMeme)))
	http.Handle("/api/memes/search", corsHandler(limiter.RateLimit(searchMemes)))
	http.Handle("/imgs/", corsHandler(limiter.RateLimit(serveMedia)))
	// Start server
	log.Info("Starting server", "PORT", serverPort)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", serverPort), nil); err != nil {
		log.Error("Failed to listen on port", "PORT", serverPort)
	}
}
