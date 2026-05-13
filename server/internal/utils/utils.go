package utils

import (
	"os"
	"fmt"
	"log"
	"mime"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"github.com/google/uuid"
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


func GetEnvOrExit(key string) string {
	if value, ok := os.LookupEnv(key); ok && value != "" {
		return value
	}
	log.Println("Environment variable", key, "not set or empty")
	os.Exit(1)
	return ""
}

// returns a random UUID
func RandomUUID() string {
	return uuid.New().String()
}

// ValidateUUID validates that a string is a valid UUID format
func ValidateUUID(id string) error {
	_, err := uuid.Parse(id)
	return err
}

// converts a mimetype like image/jpeg to an extension like '.jpg'
func MimeToExtension(mimeType string) (string, error) {
	ext, err := mime.ExtensionsByType(mimeType)
	if err != nil {
		return "", fmt.Errorf("invalid media mime type")
	}
	return ext[len(ext)-1], nil
}
