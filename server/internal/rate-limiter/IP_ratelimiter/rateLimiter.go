package rateLimiter

import (
	"fmt"
	"log/slog"
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
const TOKEN_RATE = 20 // 20 request per second
const TOKEN_BURST = 5

type ClientLimiter struct {
	limiter  *rate.Limiter // token bucket rate limiter
	lastSeen time.Time
}

type RateLimiter struct {
	clients     map[string]*ClientLimiter
	clientsLock sync.Mutex
	rate        rate.Limit
	burst       int
	log         *slog.Logger
}

func NewRateLimiter(rate rate.Limit, burst int) *RateLimiter {
	opts := &slog.HandlerOptions{

		Level: slog.LevelInfo,
	}
	handler := RateLimiter{
		clients: make(map[string]*ClientLimiter),
		rate:    rate,
		burst:   burst,
		log:     slog.New(slog.NewJSONHandler(os.Stdout, opts)).With("MODULE", "RATE_LIMITER"),
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
		remove := make([]string, 0)
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

func (h *RateLimiter) getIP(r *http.Request) string {
	// Check common proxy headers
	realIP := r.Header.Get("X-Real-IP")
	// h.log.Debug("real ip", "X-Real-IP", realIP)
	if realIP != "" {
		return realIP
	}

	forwardedFor := r.Header.Get("X-Forwarded-For")
	// h.log.Debug("forwarded ip", "X-Forwarded-For", forwardedFor)

	if forwardedFor != "" {
		// Take first IP in X-Forwarded-For list
		if ips := strings.SplitN(forwardedFor, ",", 2); len(ips) > 0 {
			return strings.TrimSpace(ips[0])
		}
	}

	// Fallback to remote address
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}

func (h *RateLimiter) RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := h.getIP(r)

		limiter := h.getClientLimiter(ip)
		h.log.Info("Received request", "IP", ip, "tokens_available", fmt.Sprintf("%.3f",limiter.Tokens()))
		if !limiter.Allow() {
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
