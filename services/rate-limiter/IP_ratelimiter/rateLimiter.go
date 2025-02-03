package rateLimiter

import (
	"log"
	"net"
	"net/http"
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
