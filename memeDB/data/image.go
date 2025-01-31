package data

import (
	"database/sql"
	"fmt"
	"log"
	"time"
)

type Image struct {
	Id          string
	Url         string
	upload_date time.Time
}
type DB struct {
	db  *sql.DB
	log *log.Logger
}

func NewDB(db *sql.DB, log *log.Logger) *DB {
	return &DB{db: db, log: log}
}

/**
 * SaveImage saves the image to the database and returns its ID
 * @param i *Image
 * @return int64, error
 */
func (db *DB) SaveImage(i *Image) (int64, error) {
	tx, err := db.db.Begin()
	if err != nil {
		return -1, err
	}
	defer tx.Rollback()
	res, err := tx.Exec(`
	INSERT INTO images (image_url)
	VALUES(?);`, i.Url)
	if err != nil {
		return -1, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return -1, err
	}
	fmt.Println("Saved image with ID: ", id)
	tx.Commit()
	return id, nil
}

func (db *DB) GetImage(id int64) (*Image, error) {
	image := &Image{}
	// var upload_date string
	row := db.db.QueryRow(`
        SELECT image_url, upload_date, image_id
        FROM images
        WHERE image_id = ?;`, id)

	err := row.Scan(&image.Url, &image.upload_date, &image.Id)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("no image found with id %d", id)
		}
		return nil, err // Propagate other errors
	}

	return image, nil
}

func (db *DB) DeleteImage(id int64) error {
	_, err := db.db.Exec(`
	DELETE FROM images
	WHERE image_id = ?;`, id)
	if err != nil {
		return err
	}
	db.log.Println("Deleted image with ID:", id)
	return nil
}

func (db *DB) SaveTag(tag_name string, imageID int64) error {
	tx, err := db.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var tagID int64
	// 1. First check if tag exists
	err = tx.QueryRow(`
	SELECT tag_id FROM tags WHERE tag_name = ?
	`, tag_name).Scan(&tagID)

	// 2. Save tag to tags table if it doesn't exist
	if err == sql.ErrNoRows {
		// Tag doesn't exist
		_, err := tx.Exec(`
		INSERT INTO tags (tag_name)
		SELECT ?;
			`, tag_name)
		if err != nil {
			return err
		}
	}

	// 3. Save the relationship between the image and the tag
	_, err = tx.Exec(`
	INSERT INTO image_tags (image_id, tag_id)	
	VALUES(?, ?);
	`, imageID, tagID)
	if err != nil {
		return err
	}
	tx.Commit()
	return nil
}
