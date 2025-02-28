package db

import (
	"database/sql"
	"fmt"

	"github.com/BassemHalim/memeDB/memeService/internal/utils"
)

func buildDBConnString() string {
	host := utils.GetEnvOrDefault("DB_HOST", "localhost")
	port := utils.GetEnvOrDefault("DB_PORT", "5432")
	user := utils.GetEnvOrDefault("DB_USER", "postgres")
	password := utils.GetEnvOrDefault("DB_PASSWORD", "postgres")
	DBname := utils.GetEnvOrDefault("DB_NAME", "memedb")

	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, DBname,
	)
}

func New() (*sql.DB, error) {
	db, err := sql.Open("postgres", buildDBConnString())
	if err != nil {
		return nil, fmt.Errorf("error connecting to the database: %v", err)
	}
	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("error pinging the database: %v", err)
	}

	return db, err
}
