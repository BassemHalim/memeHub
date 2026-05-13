package server

import (
	"encoding/json"
	"net/http"
	"os"
	"sync"
)

const bannerFile = "banner.json"

type BannerConfig struct {
	Text    string `json:"text"`
	BgColor string `json:"bgColor"`
	FgColor string `json:"fgColor"`
}

var bannerMu sync.RWMutex

// GET /api/banner
func (s *Server) GetBanner(w http.ResponseWriter, r *http.Request) {
	bannerMu.RLock()
	defer bannerMu.RUnlock()

	data, err := os.ReadFile(bannerFile)
	if err != nil {
		// No banner file = empty banner
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(BannerConfig{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

// PUT /api/admin/banner
func (s *Server) UpdateBanner(w http.ResponseWriter, r *http.Request) {
	var cfg BannerConfig
	if err := json.NewDecoder(r.Body).Decode(&cfg); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}

	data, err := json.Marshal(cfg)
	if err != nil {
		s.handleError(w, err, "failed to encode banner", http.StatusInternalServerError)
		return
	}

	bannerMu.Lock()
	defer bannerMu.Unlock()

	if err := os.WriteFile(bannerFile, data, 0644); err != nil {
		s.handleError(w, err, "failed to write banner file", http.StatusInternalServerError)
		return
	}
	s.log.Info("Banner updated", "text", cfg.Text)
	w.WriteHeader(http.StatusOK)
}
