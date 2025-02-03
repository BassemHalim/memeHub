package rateLimiter

import (
	"testing"
	"time"
)

func TestBasic(t *testing.T) {
	limiter := NewRateLimiter(1, 1)
	ip := "123"
	client_limiter := limiter.getClientLimiter(ip)
	if !client_limiter.Allow() {
		t.Errorf("This request should have been accepted")
	}
}

func TestRateLimit(t *testing.T) {
	limiter := NewRateLimiter(1, 1)
	ip := "123"
	client_limiter := limiter.getClientLimiter(ip)
	client_limiter.Allow()

	if client_limiter.Allow() {
		t.Errorf("This request should have been rejected")
	}

}

func TestLimitThenAccept(t *testing.T) {
	limiter := NewRateLimiter(1, 1)
	ip := "123"
	client_limiter := limiter.getClientLimiter(ip)
	client_limiter.Allow()

	if client_limiter.Allow() {
		t.Errorf("This request should have been rejected")
	}
	time.Sleep(time.Second)
	if !client_limiter.Allow() {
		t.Errorf("This request should have been accepted")
	}

}

func TestMultipleClients(t *testing.T) {
	limiter := NewRateLimiter(1, 1)
	ip1 := "123"
	ip2 := "245"
	client_limiter1 := limiter.getClientLimiter(ip1)
	client_limiter2 := limiter.getClientLimiter(ip2)

	if !client_limiter1.Allow() {
		t.Errorf("This request should have been accepted")
	}
	if !client_limiter2.Allow() {
		t.Errorf("This request should have been accepted")
	}

}
