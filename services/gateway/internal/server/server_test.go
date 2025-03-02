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

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	"google.golang.org/grpc"
)

func GetDebugLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
}
func TestBadGetMeme(t *testing.T) {
	server, err := New(nil, nil, nil, GetDebugLogger(), nil)
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
	UploadMemeFunc        func(ctx context.Context, in *pb.UploadMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error)
	GetMemeFunc           func(ctx context.Context, in *pb.GetMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error)
	DeleteMemeFunc        func(ctx context.Context, in *pb.DeleteMemeRequest, opts ...grpc.CallOption) (*pb.DeleteMemeResponse, error)
	GetTimelineMemesFunc  func(ctx context.Context, in *pb.GetTimelineRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error)
	FilterMemesByTagsFunc func(ctx context.Context, in *pb.FilterMemesByTagsRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error)
	SearchMemesFunc       func(ctx context.Context, in *pb.SearchMemesRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error)
	SearchTagsFunc        func(ctx context.Context, in *pb.SearchTagsRequest, opts ...grpc.CallOption) (*pb.TagsResponse, error)
}

func (c *MockGRPCClient) GetMeme(ctx context.Context, in *pb.GetMemeRequest, opts ...grpc.CallOption) (*pb.MemeResponse, error) {
	return &pb.MemeResponse{
		Id:         in.Id,
		MediaUrl:   "https://example.com/image/123.jpg",
		MediaType:  "image/jpg",
		Name:       "test",
		Tags:       []string{"test1", "test2"},
		Dimensions: []int32{1080, 1080},
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

func (m *MockGRPCClient) FilterMemesByTags(ctx context.Context, in *pb.FilterMemesByTagsRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error) {
	return m.FilterMemesByTagsFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) SearchMemes(ctx context.Context, in *pb.SearchMemesRequest, opts ...grpc.CallOption) (*pb.MemesResponse, error) {
	return m.SearchMemesFunc(ctx, in, opts...)
}

func (m *MockGRPCClient) SearchTags(ctx context.Context, in *pb.SearchTagsRequest, opts ...grpc.CallOption) (*pb.TagsResponse, error) {
	return m.SearchTagsFunc(ctx, in, opts...)
}

func TestGetMeme(t *testing.T) {
	client := MockGRPCClient{}

	server, err := New(&client, nil, nil, GetDebugLogger(), nil)
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
	vals := map[string]string{}
	json.Unmarshal(body, &vals)
	fmt.Println(string(body))
	t.Log("Expected 7218d21c-ac37-4ebe-b436-c51486d23b95 received ", vals["id"])
}
