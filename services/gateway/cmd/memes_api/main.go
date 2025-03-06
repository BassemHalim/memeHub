package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/BassemHalim/memeDB/gateway/internal/config"
	"github.com/BassemHalim/memeDB/gateway/internal/fileserver"
	"github.com/BassemHalim/memeDB/gateway/internal/server"

	"github.com/BassemHalim/memeDB/gateway/internal/middleware"

	rateLimiter "github.com/BassemHalim/memeDB/rate-limiter/IP_ratelimiter"
	"golang.org/x/time/rate"
)

func main() {
	lvl := new(slog.LevelVar)
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})).With("Service", "MEME_GATEWAY")
	cfg, err := config.NewConfig()
	if err != nil {
		log.Error("Failed to load config file", "Error", err)
		panic("Failed to load config")
	}
	log.Info("Config", "Domains", cfg.WhitelistedDomains, "Upload File Size", cfg.MaxUploadSize, "PORT", cfg.Port)

	if cfg.LogLevel == -4 {
		lvl.Set(slog.LevelDebug)
		log.Debug("-----------------Debugging Mode---------------")
	}

	limiter := rateLimiter.NewRateLimiter(rate.Limit(cfg.TokenRate), int(cfg.BurstRate))
	log.Info("Rate Limiter", "RATE", cfg.TokenRate, "BURST", cfg.BurstRate)

	memeClient, err := server.NewMemeClient()
	if err != nil {
		log.Error("Failed to connect to GRPC Server", "ERROR", err)
	}
	server, err := server.New(memeClient, cfg, limiter, log, &http.Client{Timeout: 1 * time.Second})
	if err != nil {
		log.Error("failed to create server", "ERROR", err)
		return
	}

	getMemesTimeline := http.HandlerFunc(server.GetTimeline)
	uploadMeme := http.HandlerFunc(server.UploadMeme)
	searchMemes := http.HandlerFunc(server.SearchMemes)
	getMeme := http.HandlerFunc(server.GetMeme)
	deleteMeme := http.HandlerFunc(server.DeleteMeme)
	searchTags := http.HandlerFunc(server.SearchTags)
	updateTags := http.HandlerFunc(server.UpdateTags)
	http.Handle("GET /api/memes", middleware.CORS(limiter.RateLimit(getMemesTimeline)))
	http.Handle("GET /api/memes/search", middleware.CORS(limiter.RateLimit(searchMemes)))
	http.Handle("GET /api/tags/search", middleware.CORS(limiter.RateLimit(searchTags)))
	http.Handle("POST /api/meme", middleware.CORS(limiter.RateLimit(uploadMeme)))
	http.Handle("GET /api/meme/{id}", middleware.CORS(limiter.RateLimit(getMeme)))

	http.Handle("DELETE /api/meme/{id}", middleware.CORS(limiter.RateLimit(middleware.Auth(deleteMeme))))
	http.Handle("PATCH /api/meme/{id}/tags", middleware.CORS(limiter.RateLimit(middleware.Auth(updateTags))))

	fileServer, err := fileserver.New(log)
	if err != nil {
		log.Error("Failed to create file server", "ERROR", err)
	}
	serveMedia := http.HandlerFunc(fileServer.Handler)
	http.Handle("/imgs/", middleware.CORS(limiter.RateLimit(serveMedia)))

	// Start server
	log.Info("Starting server", "PORT", cfg.Port)
	if err := http.ListenAndServe(fmt.Sprintf(":%d", cfg.Port), nil); err != nil {
		log.Error("Failed to listen on port", "PORT", cfg.Port)
	}
}
