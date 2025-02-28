package fileserver

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

type FileServer struct {
	handler *http.Handler
	dir     string
	log    *slog.Logger
}

func New(log *slog.Logger) (*FileServer, error) {
	uploadDir := "images"
	// Ensure the upload directory is relative to the current working directory
	cwd, err := os.Getwd()
	if err != nil {
		log.Error("Failed to get current working directory", "ERROR", err)
		return nil, err
	}
	uploadDir = filepath.Join(cwd, uploadDir)
	fs := http.FileServer(http.Dir(uploadDir))
	return &FileServer{
		handler: &fs,
		dir:     uploadDir,
	}, nil
}


func (s *FileServer) Handler(w http.ResponseWriter, r *http.Request) {
		s.log.Info("/imgs", "IMAGE_PATH", r.URL.Path)
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
		http.StripPrefix("/imgs/", *s.handler).ServeHTTP(w, r)
	}

