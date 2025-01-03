package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"path"
	"time"

	"github.com/BassemHalim/memeDB/data"

	pb "github.com/BassemHalim/memeDB/protobuff"
	"github.com/google/uuid"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type server struct {
	pb.UnimplementedMemeServiceServer
	db *data.DB
}

const IMAGES_PATH = "images"

/*
grpcurl -plaintext -d '{
"image_data": "SGVsbG8gV29ybGQ=",
"image_name": "test_meme.jpg",
"mime_type": "image/jpeg",
"tags": ["funny", "test", "meme"]
}' localhost:1234 meme_service.MemeService/UploadMeme
*/
func (s *server) UploadMeme(ctx context.Context, req *pb.UploadMemeRequest) (*pb.UploadMemeResponse, error) {
	// The image is assumed to be within the size limits, verified by api gateway
	log.Println("Received: ", req.ImageName, req.Tags)
	// Create directory with explicit permissions
	err := os.MkdirAll(IMAGES_PATH, 0755)
	if err != nil {
		return nil, fmt.Errorf("failed to create directory: %v", err)
	}
	// TODO: move everything into a transaction
	
	// Create file with explicit permissions
	imageID := uuid.NewString()
	filePath := path.Join(IMAGES_PATH, imageID+path.Ext(req.ImageName))
	// TODO: check if the file already exists
	f, err := os.OpenFile(filePath, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return nil, fmt.Errorf("failed to create file: %v", err)
	}
	defer f.Close()

	// Write image data
	if _, err := f.Write(req.ImageData); err != nil {
		return nil, fmt.Errorf("failed to write image: %v", err)
	}

	img_ID, err:= s.db.SaveImage(&data.Image{
		Url: filePath,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to save image: %v", err)
	}
	for _, tag := range req.Tags {
		err:= s.db.SaveTag(tag, img_ID)
		if err != nil {
			return nil, fmt.Errorf("failed to save tag: %v", err)
		}

	}

	return &pb.UploadMemeResponse{
		MemeId:          imageID,
		Url:             "http://localhost:8080/" + filePath,
		UploadTimestamp: time.Now().Unix(),
	}, nil
}

const TCP_PORT = ":1234"

func main() {
	db := data.InitDB()
	defer db.Close()
	lis, err := net.Listen("tcp", TCP_PORT)
	if err != nil {
		log.Fatalf("Failed to listen on TCP port %v", TCP_PORT)
	}

	// pass db to the UploadMeme function
	s := grpc.NewServer()
	pb.RegisterMemeServiceServer(s, &server{db: data.NewDB(db, log.New(os.Stdout, "memeDB: ", log.LstdFlags))})

	reflection.Register(s)

	log.Println("gRPC server Listening on Port: ", TCP_PORT)
	if err := s.Serve(lis); err != nil {
		log.Fatalln("Failed to serve on Port: ", TCP_PORT)
	}

}
