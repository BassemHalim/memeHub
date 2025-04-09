package server

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

func loadTLSCredentials() (credentials.TransportCredentials, error) {
	// Load certificate of the CA who signed server's certificate

	pemServerCA, err := os.ReadFile("cert/ca-cert.pem")
	if err != nil {
		return nil, err
	}
	certPool := x509.NewCertPool()
	if !certPool.AppendCertsFromPEM(pemServerCA) {
		return nil, fmt.Errorf("failed to add server CA's certificate")
	}

	// Create the credentials and return it
	config := &tls.Config{
		RootCAs: certPool,
	}

	return credentials.NewTLS(config), nil
}

func NewMemeClient() (pb.MemeServiceClient, error) {
	// Set up a connection to the server.
	creds, err := loadTLSCredentials()
	if err != nil{
		return nil, err
	}
	host := os.Getenv("GRPC_HOST")
	port := os.Getenv("GRPC_PORT")
	connString := fmt.Sprintf("%s:%s", host, port)
	conn, err := grpc.NewClient(connString, grpc.WithTransportCredentials(creds))
	if err != nil {
		return nil, err
	}
	// create client
	client := pb.NewMemeServiceClient(conn)
	return client, nil
}
