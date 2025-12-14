package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidateBrowserRequest(t *testing.T) {
	allowedDomains := []string{"localhost", "qasrelmemez.com"}

	// Create a test handler that will be called if validation passes
	testHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("success"))
	})

	// Wrap the test handler with the browser validation middleware
	handler := ValidateBrowserRequest(allowedDomains)(testHandler)

	tests := []struct {
		name           string
		userAgent      string
		referer        string
		origin         string
		expectedStatus int
	}{
		{
			name:           "Valid browser request with referer",
			userAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			referer:        "https://qasrelmemez.com/memes",
			origin:         "",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Valid browser request with origin",
			userAgent:      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			referer:        "",
			origin:         "https://localhost:3000",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Valid browser request with both referer and origin",
			userAgent:      "Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0",
			referer:        "https://qasrelmemez.com/",
			origin:         "https://qasrelmemez.com",
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Missing User-Agent",
			userAgent:      "",
			referer:        "https://qasrelmemez.com/memes",
			origin:         "",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Bot User-Agent (curl)",
			userAgent:      "curl/7.68.0",
			referer:        "https://qasrelmemez.com/memes",
			origin:         "",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Bot User-Agent (python)",
			userAgent:      "python-requests/2.25.1",
			referer:        "https://qasrelmemez.com/memes",
			origin:         "",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Bot User-Agent (wget)",
			userAgent:      "Wget/1.20.3 (linux-gnu)",
			referer:        "https://qasrelmemez.com/memes",
			origin:         "",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Missing referer and origin",
			userAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			referer:        "",
			origin:         "",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Invalid domain in referer",
			userAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			referer:        "https://evil.com/attack",
			origin:         "",
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Invalid domain in origin",
			userAgent:      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			referer:        "",
			origin:         "https://malicious.com",
			expectedStatus: http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/test", nil)
			if tt.userAgent != "" {
				req.Header.Set("User-Agent", tt.userAgent)
			}
			if tt.referer != "" {
				req.Header.Set("Referer", tt.referer)
			}
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}

func TestIsBrowserUserAgent(t *testing.T) {
	tests := []struct {
		name      string
		userAgent string
		expected  bool
	}{
		{
			name:      "Chrome browser",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			expected:  true,
		},
		{
			name:      "Firefox browser",
			userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:89.0) Gecko/20100101 Firefox/89.0",
			expected:  true,
		},
		{
			name:      "Safari browser",
			userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
			expected:  true,
		},
		{
			name:      "Edge browser",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59",
			expected:  true,
		},
		{
			name:      "curl",
			userAgent: "curl/7.68.0",
			expected:  false,
		},
		{
			name:      "wget",
			userAgent: "Wget/1.20.3 (linux-gnu)",
			expected:  false,
		},
		{
			name:      "Python requests",
			userAgent: "python-requests/2.25.1",
			expected:  false,
		},
		{
			name:      "Go http client",
			userAgent: "Go-http-client/1.1",
			expected:  false,
		},
		{
			name:      "Postman",
			userAgent: "PostmanRuntime/7.28.0",
			expected:  false,
		},
		{
			name:      "Googlebot",
			userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
			expected:  false,
		},
		{
			name:      "Empty user agent",
			userAgent: "",
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isBrowserUserAgent(tt.userAgent)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v for user agent: %s", tt.expected, result, tt.userAgent)
			}
		})
	}
}

func TestIsValidDomain(t *testing.T) {
	allowedDomains := []string{"localhost", "qasrelmemez.com"}

	tests := []struct {
		name     string
		referer  string
		origin   string
		expected bool
	}{
		{
			name:     "Valid referer",
			referer:  "https://qasrelmemez.com/memes",
			origin:   "",
			expected: true,
		},
		{
			name:     "Valid origin",
			referer:  "",
			origin:   "https://localhost:3000",
			expected: true,
		},
		{
			name:     "Valid both",
			referer:  "https://qasrelmemez.com/",
			origin:   "https://qasrelmemez.com",
			expected: true,
		},
		{
			name:     "Invalid referer",
			referer:  "https://evil.com/attack",
			origin:   "",
			expected: false,
		},
		{
			name:     "Invalid origin",
			referer:  "",
			origin:   "https://malicious.com",
			expected: false,
		},
		{
			name:     "Both empty",
			referer:  "",
			origin:   "",
			expected: false,
		},
		{
			name:     "Localhost with port",
			referer:  "http://localhost:3000/memes",
			origin:   "",
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isValidDomain(tt.referer, tt.origin, allowedDomains)
			if result != tt.expected {
				t.Errorf("Expected %v, got %v for referer: %s, origin: %s", tt.expected, result, tt.referer, tt.origin)
			}
		})
	}
}
