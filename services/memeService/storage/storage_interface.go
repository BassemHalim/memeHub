package storage

type Storage interface {
	SaveImage(filename string, image []byte) error
	SoftDeleteImage(filename string) error
	RenameImage(oldFilename string, newFilename string) error
}
