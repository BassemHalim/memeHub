package notifications

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"strings"
)

var API_URL string 
var CHAT_ID int64  
var log *slog.Logger
func init() {
	log = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})).With("Service", "NOTIFICATION_SERVICE")
	host_url, found:= os.LookupEnv("NOTIFICATION_SERVICE_HOST")
	if !found {
		fmt.Println("NOTIFICATION_SERVICE_HOST environment variable not set")
		return
	}
	API_URL = host_url
	chat_id, found := os.LookupEnv("TELEGRAM_CHAT_ID")
	if !found {
		fmt.Println("TELEGRAM_CHAT_ID environment variable not set")
		return
	}
	int_chat_id, err := strconv.ParseInt(chat_id, 10, 64)
	if err != nil {
		fmt.Printf("Error parsing TELEGRAM_CHAT_ID: %v\n", err)
		return
	}
	CHAT_ID = int_chat_id

}
type Meme struct {
	Id       string
	MediaUrl string
	Name     string
	Tags     []string
}

type sendPhotoPayload struct {
	ChatID    int64  `json:"chat_id"`
	Photo     string `json:"photo"`
	Caption   string `json:"caption"`
	ParseMode string `json:"parse_mode"`
}

func NewMeme(meme Meme) error {
	log.Info("New Meme Notification", "MemeID", meme.Id, "Name", meme.Name, "Tags", meme.Tags, "MediaUrl", meme.MediaUrl)
	method := "POST"
	payload := sendPhotoPayload{
		ChatID: CHAT_ID,
		Photo:  meme.MediaUrl,
		Caption: fmt.Sprintf("🎉 New meme upload 🎉\n*Name*: %s\n*Tags*:   %s\n*URL*:    [here](https://qasrelmemez.com/meme/%s)",
			meme.Name, strings.Join(meme.Tags, ", "), meme.Id),
		ParseMode: "MarkdownV2",
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	client := &http.Client{}
	req, err := http.NewRequest(method, API_URL, bytes.NewReader(payloadBytes))

	if err != nil {
		return err
	}
	req.Header.Add("Content-Type", "application/json")

	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return fmt.Errorf("Error: %s, Status Code: %d\n", body, res.StatusCode)
	}
	return nil
}
