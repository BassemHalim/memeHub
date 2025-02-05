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
	"path/filepath"
	"time"

	"log"
	"net/http"
	"os"
	"strings"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	rateLimiter "github.com/BassemHalim/memeDB/rate-limiter/IP_ratelimiter"
	"google.golang.org/grpc"
)

var sampleMemes = []struct {
	ID        int      `json:"id"`
	MediaURL  string   `json:"media_url"`
	MediaType string   `json:"media_type"`
	Tags      []string `json:"tags"`
}{
	{
		ID:        1,
		MediaURL:  "https://i.redd.it/jv65hih9gbtd1.jpeg",
		MediaType: "image/jpeg",
		Tags:      []string{"funny", "meme"},
	},
	{
		ID:        2,
		MediaURL:  "https://i.redd.it/99vxtugaizpd1.jpeg",
		MediaType: "image/jpeg",
		Tags:      []string{"de7k", "meme"},
	},
	{
		ID:        3,
		MediaURL:  "https://i.redd.it/yq78v9mfmlpd1.jpeg",
		MediaType: "image/jpeg",
		Tags:      []string{"ha5a", "meme"},
	},
	{
		ID:        4,
		MediaURL:  "https://media.filfan.com/NewsPics/FilFanNew/Large/273802_0.png",
		MediaType: "image/jpeg",
		Tags:      []string{"hahaha", "meme"},
	},
	{
		ID:        5,
		MediaURL:  "https://i.pinimg.com/736x/85/1f/08/851f082ec2bb5011f8f9a729878b0308.jpg",
		MediaType: "image/jpeg",
		Tags:      []string{"funny", "meme"},
	},
	{
		ID:        6,
		MediaURL:  "https://i.pinimg.com/736x/2e/7e/9a/2e7e9a919d7537f884e7a777c9e7e589.jpg",
		MediaType: "image/jpeg",
		Tags:      []string{"de7k", "meme"},
	},
	{
		ID:        7,
		MediaURL:  "https://i.pinimg.com/474x/ad/97/2a/ad972a156b9e81a6b1ae09488c7481e6.jpg",
		MediaType: "image/jpeg",
		Tags:      []string{"ha5a", "meme"},
	},
	{
		ID:        8,
		MediaURL:  "/restaurant.jpeg",
		MediaType: "image/jpeg",
		Tags:      []string{"hahaha", "meme"},
	},
}

type MemeUpload struct {
	MediaURL  string   `json:"media_url"`
	MimeType  string   `json:"mime_type"`
	Tags      []string `json:"tags"`
	ImageData []byte   `json:"image_data"`
}

func getMemes(memeClient pb.MemeServiceClient) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// get memes from memeService
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		resp, err := memeClient.FilterMemesByTags(ctx, &pb.FilterMemesByTagsRequest{
			Tags:      []string{}, // TODO: get tags from query params
			PageSize:  10,
			Page:      1,
			SortOrder: pb.SortOrder_NEWEST,
			MatchType: pb.TagMatchType_ANY,
		})
		if err != nil {
			log.Println("Error getting memes", err)
			http.Error(w, "Error getting memes", http.StatusInternalServerError)
			return
		}
		// return all the sampleMemes as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)

	}
}
func uploadMeme(memeClient pb.MemeServiceClient, log *log.Logger) func(w http.ResponseWriter, r *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// Multipart form data
		r.ParseMultipartForm(32 << 20) // limit your max input length to 32MB

		// get the json metadata
		jsonData := r.FormValue("meme")
		log.Println("JSON Data:", jsonData)
		var meme MemeUpload
		if err := json.Unmarshal([]byte(jsonData), &meme); err != nil {
			log.Println("Error parsing the meme data", err)
			http.Error(w, "Error parsing the meme data", http.StatusBadRequest)
			return
		}

		// verify if mime type is for an image
		if strings.Split(meme.MimeType, "/")[0] != "image" {
			log.Println("Invalid media type", meme.MimeType)
			http.Error(w, "Invalid media type", http.StatusBadRequest)
			return
		}

		var imgBuf bytes.Buffer

		// if no MediaURL is provided, then it's a file upload
		if meme.MediaURL == "" {
			log.Println("File upload")
			file, _, err := r.FormFile("image")
			if err != nil {
				log.Println("Error reading the image", err)
				http.Error(w, "Error Reading the image", http.StatusBadRequest)
				return
			}
			defer file.Close()
			if _, err := imgBuf.ReadFrom(file); err != nil {
				log.Println("Error reading the image", err)
				http.Error(w, "Error reading the image", http.StatusBadRequest)
				return
			}
		} else {
			// if MediaURL is provided, then it's a URL upload
			// download the image from the URL
			resp, err := http.Get(meme.MediaURL)
			if err != nil {
				log.Println("Error reading the image", err)
				http.Error(w, "Error downloading the image", http.StatusBadRequest)
				return
			}
			defer resp.Body.Close()
			log.Println("Image downloaded from URL", resp.Status)
			if _, err := imgBuf.ReadFrom(resp.Body); err != nil {
				log.Println("Error reading the image", err)
				http.Error(w, "Error reading the image", http.StatusBadRequest)
				return
			}
		}
		// get the image dimensions from imgBuf
		imgBytes := imgBuf.Bytes()
		imgReader := bytes.NewReader(imgBytes)
		imgConfig, _, err := image.DecodeConfig(imgReader)
		if err != nil {
			log.Println("Failed to read image config", err, len(imgBytes))
			http.Error(w, "Error reading the image", http.StatusBadRequest)
			return
		}
		// verify image mime type
		fmt.Println("Image dimensions: ", imgConfig.Width, imgConfig.Height)
		fmt.Println(meme)
		// call the memeService to upload the meme
		memeUpload := &pb.UploadMemeRequest{
			MediaType: meme.MimeType,
			Image:     imgBytes,
			Tags:      meme.Tags,
		}
		ctx, cancel := context.WithTimeout(context.Background(), time.Second)
		defer cancel()
		resp, err := memeClient.UploadMeme(ctx, memeUpload)
		if err != nil {
			log.Println("Error uploading the meme", err)
			http.Error(w, "Error uploading the meme", http.StatusInternalServerError)
			return
		}
		log.Println("Meme uploaded successfully", resp)
		// return the meme ID
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(resp)

	}
}

func initGRPCClient() (pb.MemeServiceClient, error) {
	// Set up a connection to the server.
	conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure())
	if err != nil {
		return nil, err
	}
	// create client
	client := pb.NewMemeServiceClient(conn)
	return client, nil
}

func main() {
	log := log.New(os.Stdout, "Meme-Gateway:", log.LstdFlags)
	limiter := rateLimiter.NewRateLimiter(rateLimiter.REFILL_RATE, rateLimiter.BUCKET_SIZE)
	memeServiceClient, err := initGRPCClient()

	if err != nil {
		log.Fatal("failed to connect to memeService", err)
	}
	// RequestLogger middleware logs all HTTP requests
	requestLogger := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			log.Printf("Started %s %s\n", r.Method, r.URL.Path)
			next.ServeHTTP(w, r)
			log.Printf("Completed %s %s in %v\n", r.Method, r.URL.Path, time.Since(start))
		})
	}
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

	fs := http.FileServer(http.Dir("../memeService/uploads"))

    // Handle all requests to /uploads/
    http.HandleFunc("/uploads/", func(w http.ResponseWriter, r *http.Request) {
        log.Println("serving image: ", r.URL.Path)
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
        // Remove /uploads/ prefix before serving
        r.URL.Path = r.URL.Path[len("/uploads/"):]
        
        // Serve the file
        fs.ServeHTTP(w, r)
    })

	getMemes := http.HandlerFunc(getMemes(memeServiceClient))
	uploadMeme := http.HandlerFunc(uploadMeme(memeServiceClient, log))
	


	http.Handle("/api/memes", corsHandler(limiter.RateLimit(getMemes)))
	http.Handle("/api/meme", corsHandler(limiter.RateLimit(requestLogger(uploadMeme))))
	// Start server
	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
