package storage

import (
	"errors"
)

type R2 struct{}

func NewR2() *R2 {
	return &R2{}
}

func (r *R2) SaveImage(filename string, image []byte) error {
	// return unimplemented exception
	return errors.New("R2 storage not implemented yet")
}
func (r *R2) SoftDeleteImage(filename string) error {
	return errors.New("R2 storage not implemented yet")
}
func (r *R2) RenameImage(oldFilename string, newFilename string) error {
	return errors.New("R2 storage not implemented yet")
}