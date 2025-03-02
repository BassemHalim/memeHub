package server

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"

	"github.com/BassemHalim/memeDB/gateway/internal/config"
)

func Test_isWhitelisted(t *testing.T) {
	whitelist := []string{"example.com"}
	test_url, err := url.Parse("https://example.com")
	if err != nil {
		fmt.Println("Error", err)
	}

	if !isWhitelisted(test_url, whitelist) {
		t.Fatal("The url ", test_url, " should be whitelisted", whitelist)
	}

	test_url, err = url.Parse("https://example.com.tld")
	if err != nil {
		fmt.Println("Error", err)
	}
	if isWhitelisted(test_url, whitelist) {
		t.Fatal("The url ", test_url, " should be whitelisted", whitelist)
	}
}

func Test_isWhitelistedSubdomain(t *testing.T) {
	whitelist := []string{"example.com", "imgs.imgur.com"}

	test_url, err := url.Parse("https://imgur.com")
	if err != nil {
		fmt.Println("Error", err)
	}
	if isWhitelisted(test_url, whitelist) {
		t.Fatal("The url ", test_url, " should be whitelisted", whitelist)
	}

	test_url, err = url.Parse("https://imgs.imgur.com")
	if err != nil {
		fmt.Println("Error", err)
	}
	if !isWhitelisted(test_url, whitelist) {
		t.Fatal("The url ", test_url, " should be whitelisted", whitelist)
	}

	test_url, err = url.Parse("https://imgs.imgs.imgur.com")
	if err != nil {
		fmt.Println("Error", err)
	}
	if !isWhitelisted(test_url, whitelist) {
		t.Fatal("The url ", test_url, " should be whitelisted", whitelist)
	}

}

func Test_validateURLFileSize(t *testing.T) {
	// Setup test server
	remoteServer:= httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/valid.jpg":
			w.Header().Set("Content-Length", "1000000") // 1MB
			w.Header().Set("Content-Type", "image/jpg")
			w.Write([]byte("fake image data"))
		case "/toobig.jpg":
			w.Header().Set("Content-Length", "11000000") // 11MB
			w.Header().Set("Content-Type", "image/jpg")
			w.Write([]byte("fake image data"))
		}
	}))
	defer remoteServer.Close()
	client := remoteServer.Client()
	whitelist := []string{strings.TrimPrefix(remoteServer.URL, "https://")}
	config := config.Config{
		WhitelistedDomains: whitelist,
		MaxUploadSize:        10000000, // 10MB
	}
	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
	server, err := New(nil, &config, nil, log, client)
	if err != nil {
		t.Fatal(err)
	}

	// Test valid file size
	
	validURL := remoteServer.URL + "/valid.jpg"
	fmt.Println(validURL, whitelist)
	if !server.ValidateUploadURL(validURL) {
		t.Fatal("Valid file size should pass validation")
	}

	// Test file too large
	largeURL := remoteServer.URL + "/toobig.jpg"
	if server.ValidateUploadURL(largeURL) {
		t.Fatal("File exceeding max size should fail validation")
	}
}


