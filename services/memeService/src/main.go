package main

import (
	"database/sql"
	"fmt"
	"log"
	"net"
	"os"

	pb "github.com/BassemHalim/memeDB/proto/memeService"
	"github.com/BassemHalim/memeDB/memeService/src/server"
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

func initDB() (*sql.DB, error) {

	db, err := sql.Open("postgres", buildDBConnString())
	if err != nil {
		return nil, fmt.Errorf("Error connecting to the database: %v", err)
	}
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("Error pinging the database: %v", err)
	}

	// create Tables if they don't exist
	createTables := `
    CREATE TABLE IF NOT EXISTS meme (
        id SERIAL PRIMARY KEY,
        media_url TEXT NOT NULL,
        media_type TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tag (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS meme_tag (
        meme_id INTEGER REFERENCES meme(id),
        tag_id INTEGER REFERENCES tag(id),
        PRIMARY KEY (meme_id, tag_id)
    );`

	_, err = db.Exec(createTables)
	return db, err
}

func main() {
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
	if err := s.Serve(listener); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
