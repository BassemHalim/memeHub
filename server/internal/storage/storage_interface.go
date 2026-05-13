package storage

type Storage interface {
	SaveImage(filename string, image []byte) (string,error)
	SoftDeleteImage(filename string) error
	RenameImage(oldFilename string, newFilename string) (string, error)
	ImageUrl(filename string) string
}
