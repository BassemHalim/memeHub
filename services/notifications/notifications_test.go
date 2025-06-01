package notifications_test

import (
	"testing"

	"github.com/BassemHalim/memeDB/notifications"
)

func TestNewMeme(t *testing.T) {
	// Example usage
	meme := notifications.Meme{
		Id:       "bc93499c-c991-4581-b23b-62f9fc886bde",
		MediaUrl: "https://qasrelmemez.com/imgs/430c1bb2-f846-4329-9097-9b7ac688dd51.png",
		Name:     "Example Meme",
		Tags:     []string{"funny", "example"},
	}
	notifications.NewMeme(meme)
}
