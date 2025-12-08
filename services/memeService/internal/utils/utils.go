package utils

import (
	"crypto/tls"
	"fmt"
	"log"
	"mime"
	"os"

	"github.com/google/uuid"
	"google.golang.org/grpc/credentials"
)

func GetEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func GetEnvOrExit(key string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	log.Println("Environment variable", key, "not set")
	os.Exit(1)
	return ""
}

// returns a random UUID
func RandomUUID() string {
	return uuid.New().String()
}

// ValidateUUID validates that a string is a valid UUID format
func ValidateUUID(id string) error {
	_, err := uuid.Parse(id)
	return err
}

// converts a mimetype like image/jpeg to an extension like '.jpg'
func MimeToExtension(mimeType string) (string, error) {
	ext, err := mime.ExtensionsByType(mimeType)
	if err != nil {
		return "", fmt.Errorf("invalid media mime type")
	}
	return ext[len(ext)-1], nil
}

func LoadTLSCredentials() (credentials.TransportCredentials, error) {
	// Load server's certificate and private key
	serverCert, err := tls.LoadX509KeyPair("cert/server-cert.pem", "cert/server-key.pem")
	if err != nil {
		return nil, err
	}

	// Create the credentials and return it
	config := &tls.Config{
		Certificates: []tls.Certificate{serverCert},
		ClientAuth:   tls.NoClientCert,
	}

	return credentials.NewTLS(config), nil
}
