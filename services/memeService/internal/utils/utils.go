package utils

import (
	"fmt"
	"mime"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Saves image with filename and dir at dir/filename
func SaveImage(dir string, filename string, image []byte) error {
	filePath := filepath.Join(dir, filename)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("error creating memes directory, err:%s", err)
	}

	if err := os.WriteFile(filePath, image, 0666); err != nil {
		return fmt.Errorf("error saving image to disk err:%s", err)
	}
	return nil
}

// Soft deletes the image at dir/filename by just renaming it to deleted_filename
func SoftDeleteImage(dir string, filename string) error {
	oldPath := filepath.Join(dir, filename)
	newPath := filepath.Join(dir, "deleted_"+filename)
	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("error deleting image %s", err)
	}
	return nil
}

// returns a random UUID
func RandomUUID() string {
	return uuid.New().String()
}

// converts a mimetype like image/jpeg to an extension like '.jpg'
func MimeToExtension(mimeType string) (string, error) {
	ext, err := mime.ExtensionsByType(mimeType)
	if err != nil {
		return "", fmt.Errorf("invalid media mime type")
	}
	return ext[len(ext)-1], nil
}


func UploadDir() string {
	uploadDir := "images"
	cwd, err := os.Getwd()
	if err != nil {
		return "./images" // return the relative path
	}
	return filepath.Join(cwd, uploadDir)
}
