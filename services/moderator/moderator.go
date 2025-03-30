package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/BassemHalim/memeDB/queue"
	"github.com/google/generative-ai-go/genai"
	"google.golang.org/api/option"
)

type MemeUploadRequest struct {
	Name      string   `json:"name" validate:"required"`
	MediaURL  string   `json:"media_url,omitempty" validate:"omitempty,url"`
	MimeType  string   `json:"mime_type,omitempty"`
	Tags      []string `json:"tags" validate:"required"`
	ImageData []byte   `json:"image,omitempty" validate:"omitempty,datauri"`
}

type ModerationResponse struct {
	Safe    bool   `json:"safe"`
	Reason  string `json:"reason"`
	Caption string `json:"caption"`
}

//go:embed System_Instructions.md
var SYSTEM_INSTRUCTIONS string

//go:embed .curse_words.csv
var SLURS_LIST string

func newGeminiClient() (*genai.Client, *genai.GenerativeModel, error) {
	ctx := context.Background()

	apiKey, ok := os.LookupEnv("GEMINI_API_KEY")
	if !ok {
		return nil, nil, fmt.Errorf("environment variable GEMINI_API_KEY not set")
	}

	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, nil, fmt.Errorf("error creating client: %v", err)
	}

	model := client.GenerativeModel("gemini-2.0-flash")

	model.SetTemperature(1)
	model.SetTopK(40)
	model.SetTopP(0.95)
	model.SetMaxOutputTokens(1000)
	model.ResponseMIMEType = "application/json"
	model.SystemInstruction = genai.NewUserContent(genai.Text(SYSTEM_INSTRUCTIONS))
	return client, model, nil
}

func isMemeSafe(meme MemeUploadRequest, model *genai.GenerativeModel, ctx context.Context) (bool, error) {

	resp, err := model.GenerateContent(ctx, genai.ImageData("image/jpeg", meme.ImageData), genai.Text(meme.Name+"\n" + strings.Join(meme.Tags, " ")+"\n"))
	if err != nil {
		return false, fmt.Errorf("error sending message: %v", err)
	}

	for _, part := range resp.Candidates[0].Content.Parts {
		if txt, ok := part.(genai.Text); ok {
			var resp ModerationResponse
			fmt.Println(txt)
			err = json.Unmarshal([]byte(txt), &resp)
			if err != nil {
				return false, err
			}
			return resp.Safe, nil
		}

	}
	return false, nil
}

func run(log *slog.Logger) error {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	SYSTEM_INSTRUCTIONS = strings.Replace(SYSTEM_INSTRUCTIONS, "<slurs/>", SLURS_LIST, 1)
	rabbitMQ_URL, found := os.LookupEnv("RABBIT_MQ_URL")
	if !found {
		return fmt.Errorf("RABBIT_MQ_URL env variable not set")
	}
	memeQueue, err := queue.NewMemeQueue(rabbitMQ_URL)
	if err != nil {
		return err
	}

	geminiClient, model, err := newGeminiClient()
	if err != nil {
		return err
	}
	defer geminiClient.Close()

	msgs, err := memeQueue.Consume()
	if err != nil {
		return err
	}

	log.Info("Processing Upload Memes Requests")
	var start time.Time
	var numRequests int16 = 0
	for msg := range msgs {
		if numRequests == 0 {
			start = time.Now()
		}
		numRequests++
		// GEMINI Free Rate Limit: 15 RPM
		if numRequests == 16 {
			if time.Since(start) < time.Minute {
				log.Info("Sleeping")
				time.Sleep(time.Minute - time.Since(start))
				log.Info("Woke up")
			}
			start = time.Now()
			numRequests = 0
		}
		var memeUploadRequest MemeUploadRequest
		err = json.Unmarshal(msg.Body, &memeUploadRequest)
		if err != nil {
			log.Error("Failed to parse json message", "Body", msg.Body)
			continue
		}
		log.Info("received meme", "i", numRequests, "Name", memeUploadRequest.Name, "Tags", memeUploadRequest.Tags, )
		safe, err := isMemeSafe(memeUploadRequest, model, ctx)
		if err != nil {
			log.Error("Failed to validate meme", "ERROR", err)
			continue
		}
		if safe {
			// send to meme-service
		}

		log.Info("Meme is:", "Safe", safe)
		fmt.Println()
		// msg.Ack(false)
	}
	return nil
}

func main() {
	lvl := new(slog.LevelVar)
	log := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})).With("Service", "Moderator")
	err := run(log)
	if err != nil {
		log.Error("Failed to start moderator", "ERROR", err)
		os.Exit(-1)
	}

	os.Exit(0)
}
