package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	// queue "github.com/BassemHalim/memeDB/queue"
	"github.com/patrickmn/go-cache"
	"google.golang.org/grpc"
)

func GetDebugLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

// func NewMemeQueue() (*queue.MemeQueue, error) {
// 	MemeQueue, err := queue.NewMemeQueue(os.Getenv("RABBIT_MQ_URL"))
// 	if err != nil {
// 		return nil, err
// 	}
// 	return &MemeQueue, nil
// }

var MemCache *cache.Cache = cache.New(2*time.Minute, 2*time.Minute)

func TestBadGetMeme(t *testing.T) {
	// MemeQ, err := NewMemeQueue()
	// if err != nil {
	// 	t.Fatal("Failed to create Meme Queue")
	// }
	server, err := New(nil, nil, nil, GetDebugLogger(), nil, MemCache)
	if err != nil {
		t.Fatal("Failed to create server")
	}
	request := httptest.NewRequest(http.MethodGet, "/api/meme/123", nil)
	w := httptest.NewRecorder()
	server.GetMeme(w, request)
	res := w.Result()
	if res.StatusCode != 400 {
		t.Fatal("Response should Fail id should be a UUID", res.Status)
	}

	request = httptest.NewRequest(http.MethodPost, "/api/meme/fc2ee84a-873a-4c18-a558-82f7ca050010", nil)
	w = httptest.NewRecorder()
	server.GetMeme(w, request)
	res = w.Result()
	if res.StatusCode != 400 {
		t.Fatal("Request should be a GET request", res.Status)
	}

	// defer res.Body.Close()
	// body, err := io.ReadAll(res.Body)
	// if err != nil {
	// 	t.Fatal("Failed to read response body", "Status Code", res.StatusCode)
	// }
	// fmt.Println(string(body))

}

type MockGRPCClient struct {
	UploadMemeFunc       func(ctx context.Context, in *pb.UploadMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error)
	GetMemeFunc          func(ctx context.Context, in *pb.GetMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error)
	DeleteMemeFunc       func(ctx context.Context, in *pb.DeleteMemeRequest, opts ...grpc.CallOption) (*pb.DeleteMemeResponse, error)
	GetTimelineMemesFunc func(ctx context.Context, in *pb.GetTimelineRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error)

	SearchMemesFunc       func(ctx context.Context, in *pb.SearchMemesRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error)
	SearchTagsFunc        func(ctx context.Context, in *pb.SearchTagsRequest, opts ...grpc.CallOption) (*pb.TagsResponse, error)
	AddTagsFunc           func(ctx context.Context, in *pb.AddTagsRequest, opts ...grpc.CallOption) (*pb.AddTagsResponse, error)
	UpdateMemeFunc        func(ctx context.Context, in *pb.UpdateMemeRequest, opts ...grpc.CallOption) (*pb.UpdateMemeResponse, error)
	IncrementDownloadFunc func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error)
	IncrementShareFunc    func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error)
}

func (c *MockGRPCClient) GetMeme(ctx context.Context, in *pb.GetMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error) {
	return &pb.MemeResponse{
		Id:            in.Id,
		MediaUrl:      "https://example.com/image/123.jpg",
		MediaType:     "image/jpg",
		Name:          "test",
		Tags:          []string{"test1", "test2"},
		Dimensions:    []int32{1080, 1080},
		DownloadCount: 42,
		ShareCount:    17,
	}, nil
}
func (m *MockGRPCClient) UploadMeme(ctx context.Context, in *pb.UploadMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error) {
	return m.UploadMemeFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) DeleteMeme(ctx context.Context, in *pb.DeleteMemeRequest, opts ...grpc.CallOption) (*pb.DeleteMemeResponse, error) {
	return m.DeleteMemeFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) GetTimelineMemes(ctx context.Context, in *pb.GetTimelineRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error) {
	return m.GetTimelineMemesFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) SearchMemes(ctx context.Context, in *pb.SearchMemesRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error) {
	return m.SearchMemesFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) SearchTags(ctx context.Context, in *pb.SearchTagsRequest, opts ...grpc.CallOption) (*pb.TagsResponse, error) {
	return m.SearchTagsFunc(ctx, in, opts...)
}
func (m *MockGRPCClient) AddTags(ctx context.Context, in *pb.AddTagsRequest, opts ...grpc.CallOption) (*pb.AddTagsResponse, error) {
	return m.AddTagsFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) UpdateMeme(ctx context.Context, in *pb.UpdateMemeRequest, opts ...grpc.CallOption) (*pb.UpdateMemeResponse, error) {
	return m.UpdateMemeFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) IncrementDownload(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
	if m.IncrementDownloadFunc != nil {
		return m.IncrementDownloadFunc(ctx, in, opts...)
	}
	return &pb.IncrementEngagementResponse{Success: true}, nil
}

func (m *MockGRPCClient) IncrementShare(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
	if m.IncrementShareFunc != nil {
		return m.IncrementShareFunc(ctx, in, opts...)
	}
	return &pb.IncrementEngagementResponse{Success: true}, nil
}
func TestGetMeme(t *testing.T) {
	client := MockGRPCClient{}
	// MemeQ, err := NewMemeQueue()
	// if err != nil {
	// 	t.Fatal("Failed to create Meme Queue")
	// }
	server, err := New(&client, nil, nil, GetDebugLogger(), &http.Client{}, MemCache)
	if err != nil {
		t.Fatal("Failed to create server")
	}

	request := httptest.NewRequest(http.MethodGet, "/api/meme/7218d21c-ac37-4ebe-b436-c51486d23b95", nil)
	request.SetPathValue("id", "7218d21c-ac37-4ebe-b436-c51486d23b95")
	w := httptest.NewRecorder()
	server.GetMeme(w, request)
	res := w.Result()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("Failed to read body")
	}
	if res.StatusCode != 200 {
		t.Fatal("Request is valid", res.Status, string(body))

	}
	vals := map[string]interface{}{}
	json.Unmarshal(body, &vals)
	fmt.Println(string(body))
	t.Log("Expected 7218d21c-ac37-4ebe-b436-c51486d23b95 received ", vals["id"])

	// Verify engagement fields are included
	if _, ok := vals["download_count"]; !ok {
		t.Error("Response should include download_count field")
	}
	if _, ok := vals["share_count"]; !ok {
		t.Error("Response should include share_count field")
	}

	// Verify the values match what the mock returns
	if downloadCount, ok := vals["download_count"].(float64); ok {
		if int(downloadCount) != 42 {
			t.Errorf("Expected download_count to be 42, got %d", int(downloadCount))
		}
	}
	if shareCount, ok := vals["share_count"].(float64); ok {
		if int(shareCount) != 17 {
			t.Errorf("Expected share_count to be 17, got %d", int(shareCount))
		}
	}
}

func TestTrackDownload(t *testing.T) {
	tests := []struct {
		name           string
		memeID         string
		mockFunc       func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error)
		expectedStatus int
	}{
		{
			name:   "Valid meme ID - success",
			memeID: "7218d21c-ac37-4ebe-b436-c51486d23b95",
			mockFunc: func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
				return &pb.IncrementEngagementResponse{Success: true}, nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid UUID format",
			memeID:         "invalid-uuid",
			mockFunc:       nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "Meme not found",
			memeID: "7218d21c-ac37-4ebe-b436-c51486d23b95",
			mockFunc: func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
				return nil, fmt.Errorf("meme not found")
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:   "Internal server error",
			memeID: "7218d21c-ac37-4ebe-b436-c51486d23b95",
			mockFunc: func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
				return nil, fmt.Errorf("database error")
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &MockGRPCClient{
				IncrementDownloadFunc: tt.mockFunc,
			}

			server, err := New(client, nil, nil, GetDebugLogger(), &http.Client{}, MemCache)
			if err != nil {
				t.Fatal("Failed to create server")
			}

			request := httptest.NewRequest(http.MethodPost, "/api/memes/"+tt.memeID+"/download", nil)
			request.SetPathValue("id", tt.memeID)
			w := httptest.NewRecorder()

			server.TrackDownload(w, request)

			res := w.Result()
			if res.StatusCode != tt.expectedStatus {
				body, _ := io.ReadAll(res.Body)
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, res.StatusCode, string(body))
			}
		})
	}
}

func TestTrackShare(t *testing.T) {
	tests := []struct {
		name           string
		memeID         string
		mockFunc       func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error)
		expectedStatus int
	}{
		{
			name:   "Valid meme ID - success",
			memeID: "7218d21c-ac37-4ebe-b436-c51486d23b95",
			mockFunc: func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
				return &pb.IncrementEngagementResponse{Success: true}, nil
			},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "Invalid UUID format",
			memeID:         "invalid-uuid",
			mockFunc:       nil,
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:   "Meme not found",
			memeID: "7218d21c-ac37-4ebe-b436-c51486d23b95",
			mockFunc: func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
				return nil, fmt.Errorf("meme not found")
			},
			expectedStatus: http.StatusNotFound,
		},
		{
			name:   "Internal server error",
			memeID: "7218d21c-ac37-4ebe-b436-c51486d23b95",
			mockFunc: func(ctx context.Context, in *pb.IncrementEngagementRequest, opts ...grpc.CallOption) (*pb.IncrementEngagementResponse, error) {
				return nil, fmt.Errorf("database error")
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := &MockGRPCClient{
				IncrementShareFunc: tt.mockFunc,
			}

			server, err := New(client, nil, nil, GetDebugLogger(), &http.Client{}, MemCache)
			if err != nil {
				t.Fatal("Failed to create server")
			}

			request := httptest.NewRequest(http.MethodPost, "/api/memes/"+tt.memeID+"/share", nil)
			request.SetPathValue("id", tt.memeID)
			w := httptest.NewRecorder()

			server.TrackShare(w, request)

			res := w.Result()
			if res.StatusCode != tt.expectedStatus {
				body, _ := io.ReadAll(res.Body)
				t.Errorf("Expected status %d, got %d. Body: %s", tt.expectedStatus, res.StatusCode, string(body))
			}
		})
	}
}

func TestGetTimelineIncludesEngagementFields(t *testing.T) {
	client := &MockGRPCClient{
		GetTimelineMemesFunc: func(ctx context.Context, in *pb.GetTimelineRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error) {
			return &pb.MemesResponse{
				Memes: []*pb.MemeResponse{
					{
						Id:            "7218d21c-ac37-4ebe-b436-c51486d23b95",
						MediaUrl:      "https://example.com/image/1.jpg",
						MediaType:     "image/jpg",
						Name:          "test1",
						Tags:          []string{"tag1"},
						Dimensions:    []int32{1080, 1080},
						DownloadCount: 100,
						ShareCount:    50,
					},
					{
						Id:            "8329e32d-bc48-5fcf-c547-d62597e34c06",
						MediaUrl:      "https://example.com/image/2.jpg",
						MediaType:     "image/png",
						Name:          "test2",
						Tags:          []string{"tag2"},
						Dimensions:    []int32{720, 720},
						DownloadCount: 75,
						ShareCount:    25,
					},
				},
				TotalCount: 2,
				Page:       1,
				TotalPages: 1,
			}, nil
		},
	}

	server, err := New(client, nil, nil, GetDebugLogger(), &http.Client{}, MemCache)
	if err != nil {
		t.Fatal("Failed to create server")
	}

	request := httptest.NewRequest(http.MethodGet, "/api/memes?page=1&pageSize=10", nil)
	w := httptest.NewRecorder()
	server.GetTimeline(w, request)
	res := w.Result()

	if res.StatusCode != 200 {
		body, _ := io.ReadAll(res.Body)
		t.Fatal("Request should succeed", res.Status, string(body))
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("Failed to read body")
	}

	var response map[string]interface{}
	json.Unmarshal(body, &response)

	memes, ok := response["memes"].([]interface{})
	if !ok || len(memes) == 0 {
		t.Fatal("Response should contain memes array")
	}

	// Check first meme
	firstMeme := memes[0].(map[string]interface{})
	if _, ok := firstMeme["download_count"]; !ok {
		t.Error("First meme should include download_count field")
	}
	if _, ok := firstMeme["share_count"]; !ok {
		t.Error("First meme should include share_count field")
	}

	if downloadCount, ok := firstMeme["download_count"].(float64); ok {
		if int(downloadCount) != 100 {
			t.Errorf("Expected first meme download_count to be 100, got %d", int(downloadCount))
		}
	}
	if shareCount, ok := firstMeme["share_count"].(float64); ok {
		if int(shareCount) != 50 {
			t.Errorf("Expected first meme share_count to be 50, got %d", int(shareCount))
		}
	}

	// Check second meme
	secondMeme := memes[1].(map[string]interface{})
	if _, ok := secondMeme["download_count"]; !ok {
		t.Error("Second meme should include download_count field")
	}
	if _, ok := secondMeme["share_count"]; !ok {
		t.Error("Second meme should include share_count field")
	}

	if downloadCount, ok := secondMeme["download_count"].(float64); ok {
		if int(downloadCount) != 75 {
			t.Errorf("Expected second meme download_count to be 75, got %d", int(downloadCount))
		}
	}
	if shareCount, ok := secondMeme["share_count"].(float64); ok {
		if int(shareCount) != 25 {
			t.Errorf("Expected second meme share_count to be 25, got %d", int(shareCount))
		}
	}
}

func TestSearchMemesIncludesEngagementFields(t *testing.T) {
	client := &MockGRPCClient{
		SearchMemesFunc: func(ctx context.Context, in *pb.SearchMemesRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error) {
			return &pb.MemesResponse{
				Memes: []*pb.MemeResponse{
					{
						Id:            "7218d21c-ac37-4ebe-b436-c51486d23b95",
						MediaUrl:      "https://example.com/image/1.jpg",
						MediaType:     "image/jpg",
						Name:          "funny cat",
						Tags:          []string{"cat", "funny"},
						Dimensions:    []int32{1080, 1080},
						DownloadCount: 200,
						ShareCount:    80,
					},
				},
				TotalCount: 1,
				Page:       1,
				TotalPages: 1,
			}, nil
		},
	}

	server, err := New(client, nil, nil, GetDebugLogger(), &http.Client{}, MemCache)
	if err != nil {
		t.Fatal("Failed to create server")
	}

	request := httptest.NewRequest(http.MethodGet, "/api/memes/search?query=cat&page=1&pageSize=10", nil)
	w := httptest.NewRecorder()
	server.SearchMemes(w, request)
	res := w.Result()

	if res.StatusCode != 200 {
		body, _ := io.ReadAll(res.Body)
		t.Fatal("Request should succeed", res.Status, string(body))
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatalf("Failed to read body")
	}

	var response map[string]interface{}
	json.Unmarshal(body, &response)

	memes, ok := response["memes"].([]interface{})
	if !ok || len(memes) == 0 {
		t.Fatal("Response should contain memes array")
	}

	// Check meme includes engagement fields
	meme := memes[0].(map[string]interface{})
	if _, ok := meme["download_count"]; !ok {
		t.Error("Meme should include download_count field")
	}
	if _, ok := meme["share_count"]; !ok {
		t.Error("Meme should include share_count field")
	}

	if downloadCount, ok := meme["download_count"].(float64); ok {
		if int(downloadCount) != 200 {
			t.Errorf("Expected download_count to be 200, got %d", int(downloadCount))
		}
	}
	if shareCount, ok := meme["share_count"].(float64); ok {
		if int(shareCount) != 80 {
			t.Errorf("Expected share_count to be 80, got %d", int(shareCount))
		}
	}
}
