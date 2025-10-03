package storage

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/BassemHalim/memeDB/memeService/internal/utils"
)

type localStorage struct {
	directory string
	base_url  string
}

func NewLocalStorage() *localStorage {
	base_url := utils.GetEnvOrExit("STORAGE_BASE_URL")
	return &localStorage{
		directory: uploadDir(),
		base_url:  base_url,
	}
}

func (l *localStorage) SaveImage(filename string, image []byte) (string, error) {
	filePath := filepath.Join(l.directory, filename)
	if err := os.MkdirAll(l.directory, 0755); err != nil {
		return "", fmt.Errorf("error creating memes directory, err:%s", err)
	}

	if err := os.WriteFile(filePath, image, 0666); err != nil {
		return "", fmt.Errorf("error saving image to disk err:%s", err)
	}
	return filePath, nil
}

// Soft deletes the image at {upload dir}/filename by just renaming it to deleted_filename
func (l *localStorage) SoftDeleteImage(filename string) error {
	oldPath := filepath.Join(l.directory, filename)
	newPath := filepath.Join(l.directory, "deleted_"+filename)
	if err := os.Rename(oldPath, newPath); err != nil {
		return fmt.Errorf("error deleting image %s", err)
	}
	return nil
}

func (l *localStorage) RenameImage(oldFilename string, newFilename string) (string, error) {
	dir := l.directory
	oldPath := filepath.Join(dir, oldFilename)
	newPath := filepath.Join(dir, newFilename)
	if err := os.Rename(oldPath, newPath); err != nil {
		return "", fmt.Errorf("failed to rename image")
	}
	return newPath, nil
}

func (l *localStorage) ImageUrl(filename string) string {
	filePath := filepath.Join(l.directory, filename)
	return fmt.Sprintf("%s/%s", l.base_url, filePath)
}

func uploadDir() string {
	uploadDir := "images"
	cwd, err := os.Getwd()
	if err != nil {
		return "./images" // return the relative path
	}
	return filepath.Join(cwd, uploadDir)
}
