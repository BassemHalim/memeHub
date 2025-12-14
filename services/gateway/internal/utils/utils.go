package utils

import (
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
)

const MAX_FILE_SIZE = 2 * 1024 * 1024

func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// validates that the provided url is a valid image with size < 2MB
// data is validated with HEAD request so you should still re-validate the result
func ValidateImageContent(URL string, client *http.Client) (bool, error) {

	// Check MIME type via HEAD
	parsedURL, err := url.Parse(URL)
	if err != nil {
		return false, err
	}

	req := &http.Request{
		Method: http.MethodHead,
		URL:    parsedURL,
		Header: http.Header{
			"Accept": []string{"image/*"},
		},
	}
	resp, err := client.Do(req)
	if err != nil || resp.StatusCode != 200 {
		return false, err
	}

	contentType := resp.Header.Get("Content-Type")
	if !strings.HasPrefix(contentType, "image/") {
		return false, nil
	}

	sizeBytes := resp.Header.Get("Content-Length")
	if size, err := strconv.Atoi(sizeBytes); err != nil || size > MAX_FILE_SIZE {
		return false, nil
	}
	return true, nil
}
