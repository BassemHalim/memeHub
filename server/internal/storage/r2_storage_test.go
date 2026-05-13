package storage

import (
	"log/slog"
	"os"
	"testing"
)

var testBaseUrl string

func TestMain(m *testing.M) {
	testBaseUrl = "https://imgs.qasrelmemez.com"
	os.Setenv("STORAGE_BASE_URL", testBaseUrl)
	m.Run()
}

func TestImageUrl(t *testing.T) {
	r2 := NewR2("qasrelmemez", slog.Default())
	filename := "test_image.png"
	expectedUrl := testBaseUrl + "/imgs/" + filename
	url := r2.ImageUrl(filename)
	if url != expectedUrl {
		t.Fatalf("Expected URL %s, got %s", expectedUrl, url)
	}
}
func TestSaveImage(t *testing.T) {
	r2 := NewR2("qasrelmemez", slog.Default())
	// small red dot image
	image := []byte{
		0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
		0x01, 0x00, 0x00, 0xFF, 0x00, 0x2C, 0x00, 0x00,
		0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02,
		0x00, 0x3B,
	}

	url, err := r2.SaveImage("test.png", image)
	if err != nil {
		t.Fatal("Failed to save image to R2:", err)
	}
	// accessKeyId := utils.GetEnvOrExit("R2_ACCESS_KEY_ID")
	// accessKeySecret := utils.GetEnvOrExit("R2_ACCESS_KEY_SECRET")
	// accountId := utils.GetEnvOrExit("R2_ACCOUNT_ID")
	// base_url := utils.GetEnvOrExit("R2_BASE_URL")

	expectedUrl := testBaseUrl + "/imgs/test.png"
	if url != expectedUrl {
		t.Fatalf("Expected URL %s, got %s", expectedUrl, url)
	}
}

func TestRenameImage(t *testing.T) {
	r2 := NewR2("qasrelmemez", slog.Default())
	oldKey := "test.png"
	newKey := "renamed_test.png"
	url, err := r2.RenameImage(oldKey, newKey)
	if err != nil {
		t.Fatal("Failed to rename image in R2:", err)
	}
	expectedUrl := testBaseUrl + "/imgs/renamed_test.png"
	if url != expectedUrl {
		t.Fatalf("Expected URL %s, got %s", expectedUrl, url)
	}
}

func TestDeleteImage(t *testing.T) {
	r2 := NewR2("qasrelmemez", slog.Default())
	key := "renamed_test.png"
	err := r2.SoftDeleteImage(key)
	if err != nil {
		t.Fatal("Failed to delete image from R2:", err)
	}
}
