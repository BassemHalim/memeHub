package server

import (
	"fmt"
	"os"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure" //TODO: secure GRPC
)

func NewMemeClient() (pb.MemeServiceClient, error) {
	// Set up a connection to the server.
	host := os.Getenv("GRPC_HOST")
	port := os.Getenv("GRPC_PORT")
	conn, err := grpc.NewClient(fmt.Sprintf("%s:%s", host, port), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}
	// create client
	client := pb.NewMemeServiceClient(conn)
	return client, nil
}
