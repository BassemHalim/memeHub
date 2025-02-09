package main

import (
	"database/sql"
	"embed"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"

	"github.com/BassemHalim/memeDB/memeService/src/server"
	pb "github.com/BassemHalim/memeDB/proto/memeService"
	_ "github.com/lib/pq"
	"google.golang.org/grpc"
)

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func buildDBConnString() string {
	host := getEnvOrDefault("DB_HOST", "localhost")
	port := getEnvOrDefault("DB_PORT", "5432")
	user := getEnvOrDefault("DB_USER", "postgres")
	password := getEnvOrDefault("DB_PASSWORD", "postgres")
	dbname := getEnvOrDefault("DB_NAME", "memedb")

	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname,
	)
}

//go:embed schema.sql
var schemaFS embed.FS

func initDB() (*sql.DB, error) {

	db, err := sql.Open("postgres", buildDBConnString())
	if err != nil {
		return nil, fmt.Errorf("Error connecting to the database: %v", err)
	}
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("Error pinging the database: %v", err)
	}

	schema, err := schemaFS.ReadFile("schema.sql")
	if err != nil {
		return nil, fmt.Errorf("Failed to open SQL schema file, %w", err)
	}

	_, err = db.Exec(string(schema))

	return db, err
}

func main() {
	// TODO: add health check endpoint
	log := log.Default()
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to connect to the database: %v", err)
	}
	defer db.Close()

	serverPort := getEnvOrDefault("SERVER_PORT", "50051")
	listener, err := net.Listen("tcp", fmt.Sprintf(":%s", serverPort))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}
	fmt.Printf("Server started on port %s\n", serverPort)
	s := grpc.NewServer()
	pb.RegisterMemeServiceServer(s, server.NewMemeServer(db, log))

	c := make(chan os.Signal, 1)
	done := make(chan bool, 1)
	signal.Notify(c, os.Interrupt)
	go func() {
		<-c
		log.Println("Shutting down gracefully...")
		s.GracefulStop()
		done <- true
	}()

	go func() {
		if err := s.Serve(listener); err != nil {
			log.Printf("Failed to serve: %v", err)
			done <- true
		}
	}()

	<-done
	fmt.Println("Server stopped")

}
