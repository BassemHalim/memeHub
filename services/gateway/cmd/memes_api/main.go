package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/BassemHalim/memeDB/gateway/internal/auth"
	"github.com/BassemHalim/memeDB/gateway/internal/config"
	"github.com/BassemHalim/memeDB/gateway/internal/fileserver"
	"github.com/BassemHalim/memeDB/gateway/internal/middleware"
	"github.com/BassemHalim/memeDB/gateway/internal/server"

	"github.com/patrickmn/go-cache"

	rateLimiter "github.com/BassemHalim/memeDB/rate-limiter/IP_ratelimiter"
	"golang.org/x/time/rate"
)

func run(ctx context.Context) error {
	ctx, cancel := signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)
	defer cancel()

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
	c := cache.New(2*time.Hour, 2*time.Hour) // TODO: make these configurable
	// MemeQueue, err := queue.NewMemeQueue(os.Getenv("RABBIT_MQ_URL"))
	// if err != nil {
	// 	log.Error("Failed to connect to RabbitMQ", "ERROR", err)
	// 	return err
	// }
	// defer MemeQueue.Close()

	gateway, err := server.New(memeClient, cfg, limiter, log, &http.Client{Timeout: 1 * time.Second}, c)
	if err != nil {
		log.Error("failed to create server", "ERROR", err)
		return err
	}

	getTimelineHandler := http.HandlerFunc(gateway.GetTimeline)
	searchMemesHandler := http.HandlerFunc(gateway.SearchMemes)
	searchTagsHandler := http.HandlerFunc(gateway.SearchTags)
	getMemeHandler := http.HandlerFunc(gateway.GetMeme)
	uploadMemeHandler := http.HandlerFunc(gateway.UploadMeme)
	deleteMemeHandler := http.HandlerFunc(gateway.DeleteMeme)
	updateTagsHandler := http.HandlerFunc(gateway.UpdateTags)
	patchMemeHandler := http.HandlerFunc(gateway.PatchMeme)

	apiRouter := http.NewServeMux()
	apiRouter.HandleFunc("/login", auth.Login)
	apiRouter.Handle("GET /memes", middleware.GzipMiddleware(middleware.Cache(limiter.RateLimit(getTimelineHandler), 60)))
	apiRouter.Handle("GET /memes/search", middleware.GzipMiddleware(middleware.Cache(limiter.RateLimit(searchMemesHandler), 2*60)))
	apiRouter.Handle("GET /tags/search", middleware.GzipMiddleware(middleware.Cache(limiter.RateLimit(searchTagsHandler), 2*60)))
	apiRouter.Handle("GET /meme/{id}", middleware.Cache(limiter.RateLimit(getMemeHandler), 24*60))
	apiRouter.Handle("POST /meme", limiter.RateLimit(uploadMemeHandler))

	adminRouter := http.NewServeMux()
	adminRouter.Handle("DELETE /meme/{id}", limiter.RateLimit(middleware.Auth(deleteMemeHandler)))
	adminRouter.Handle("PATCH /meme/{id}/tags", limiter.RateLimit(middleware.Auth(updateTagsHandler)))
	adminRouter.Handle("PATCH /meme/{id}", limiter.RateLimit(middleware.Auth(patchMemeHandler)))
	adminRouter.Handle("GET /memes", middleware.GzipMiddleware(middleware.Auth(getTimelineHandler))) // same as /api/memes but without caching or rate limiting

	apiRouter.Handle("/admin/", http.StripPrefix("/admin", adminRouter))

	fileServer, err := fileserver.New(log)
	if err != nil {
		log.Error("Failed to create file server", "ERROR", err)
	}
	serveMedia := http.HandlerFunc(fileServer.Handler)
	mainRouter := http.NewServeMux()
	mainRouter.Handle("/imgs/", limiter.RateLimit(serveMedia))
	mainRouter.Handle("/api/", http.StripPrefix("/api", apiRouter))

	corsRouter := middleware.CORS(mainRouter)
	// Start server
	log.Info("Starting server", "PORT", cfg.Port)
	server := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Port),
		Handler: corsRouter,
	}
	go func() {

		if err := server.ListenAndServe(); err != nil {
			log.Error("Failed to listen on port", "PORT", cfg.Port)
		}
	}()
	for {
		select {
		case <-ctx.Done():
			log.Info("Shutting down server...")
			ctxShutdown, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := server.Shutdown(ctxShutdown); err != nil {
				log.Error("Server forced to shutdown", "ERROR", err)
			}
			log.Info("Server exited gracefully")
			return nil
		case <-time.After(1 * time.Second):
			// Keep the server running
		}
	}
}

func main() {
	ctx := context.Background()
	if err := run(ctx); err != nil {
		slog.Error("Failed to start server", "ERROR", err)
		os.Exit(1)
	}
	slog.Info("Server stopped gracefully")
}
