package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const CLEANUP_RATE time.Duration = time.Minute
const STALE_CLIENT time.Duration = time.Minute * 3
const REFILL_RATE = 1 // 1 token per second
const BUCKET_SIZE = 10

type ClientLimiter struct {
	limiter  *rate.Limiter // token bucket rate limiter
	lastSeen time.Time
}

type RateLimiter struct {
	clients     map[string]*ClientLimiter
	clientsLock sync.Mutex
	rate        rate.Limit
	burst       int
}

func NewRateLimiter(rate rate.Limit, burst int) *RateLimiter {
	handler := RateLimiter{
		clients: make(map[string]*ClientLimiter),
		rate:    rate,
		burst:   burst,
	}

	go handler.cleanUp()
	return &handler

}

// Remove old clients to reduce memory
func (l *RateLimiter) cleanUp() {
	for {
		time.Sleep(CLEANUP_RATE)
		// lock clients
		l.clientsLock.Lock()
		remove := make([]string, len(l.clients))
		for ip, client := range l.clients {
			if time.Since(client.lastSeen) > STALE_CLIENT {
				remove = append(remove, ip)
			}
		}
		for _, ip := range remove {
			delete(l.clients, ip)
		}
		l.clientsLock.Unlock()
	}
}

func (h *RateLimiter) getClientLimiter(ip string) *rate.Limiter {
	h.clientsLock.Lock()
	defer h.clientsLock.Unlock()

	client, ok := h.clients[ip]
	if !ok {
		client = &ClientLimiter{
			limiter:  rate.NewLimiter(h.rate, h.burst),
			lastSeen: time.Now(),
		}
		h.clients[ip] = client
	}
	client.lastSeen = time.Now()
	return client.limiter
}

func (h *RateLimiter) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip, _, _ := net.SplitHostPort(r.RemoteAddr)
		limiter := h.getClientLimiter(ip)
		log.Println("Received request from IP: ", ip, "Tokens available: ", limiter.Tokens())
		if !limiter.Allow() {
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

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

func main() {
	log := log.New(os.Stdout, "Meme-Gateway:", log.LstdFlags)
	limiter := NewRateLimiter(REFILL_RATE, BUCKET_SIZE)

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

	getMemes := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// return all the sampleMemes as JSON
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(sampleMemes)

	})

	uploadMeme := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		// Multipart form data
		r.ParseMultipartForm(32 << 20) // limit your max input length to 32MB

		// get the json metadata
		jsonData := r.FormValue("meme")
		log.Println(jsonData)
		var meme MemeUpload
		if err := json.Unmarshal([]byte(jsonData), &meme); err != nil {
			log.Println("Error parsing the meme data", err)
			http.Error(w, "Error parsing the meme data", http.StatusBadRequest)
			return
		}
		log.Println(meme)

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

		// return the meme ID
		// return error if the media type is not supported or is too big
		// return error if the image is not saved

	})

	
	http.Handle("/api/memes", corsHandler(limiter.RateLimit(getMemes)))
	http.Handle("/api/meme", corsHandler(limiter.RateLimit(uploadMeme)))
	// Start server
	log.Println("Starting server on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal(err)
	}
}
