package data

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3" // SQLite driver
)

func InitDB() *sql.DB {
	// Open SQLite database
	// This will create the database file if it doesn't exist
	log.Println("Initializing DB")
	db, err := sql.Open("sqlite3", "./images.db")
	if err != nil {
		log.Fatal("Error connecting to the database:", err)
	}
	// Create tables
	createTables(db)
	return db
}

func createTables(db *sql.DB) {
	// Enable foreign keys
	_, err := db.Exec("PRAGMA foreign_keys = ON;")
	if err != nil {
		log.Fatal("Error enabling foreign keys:", err)
	}

	// Create images table
	_, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS images (
            image_id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_url TEXT NOT NULL,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `)
	if err != nil {
		log.Fatal("Error creating images table:", err)
	}

	// Create tags table
	_, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS tags (
            tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_name TEXT UNIQUE NOT NULL
        );
    `)
	if err != nil {
		log.Fatal("Error creating tags table:", err)
	}

	// Create image_tags table
	_, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS image_tags (
            image_id INTEGER,
            tag_id INTEGER,
            FOREIGN KEY (image_id) REFERENCES images(image_id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE,
            PRIMARY KEY (image_id, tag_id)
        );
    `)
	if err != nil {
		log.Fatal("Error creating image_tags table:", err)
	}

	// Create indexes
	_, err = db.Exec(`
        CREATE INDEX IF NOT EXISTS idx_image_tags_image_id ON image_tags(image_id);
        CREATE INDEX IF NOT EXISTS idx_image_tags_tag_id ON image_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(tag_name);
    `)
	if err != nil {
		log.Fatal("Error creating indexes:", err)
	}
}
