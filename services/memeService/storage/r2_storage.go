package storage

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os"

	"log/slog"

	"github.com/BassemHalim/memeDB/memeService/internal/utils"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

type R2 struct {
	Bucket   *string
	s3Client *s3.Client
	base_url string
	log      *slog.Logger
}

func NewR2(bucket string, log *slog.Logger) *R2 {
	accessKeyId := utils.GetEnvOrExit("R2_ACCESS_KEY_ID")
	accessKeySecret := utils.GetEnvOrExit("R2_ACCESS_KEY_SECRET")
	accountId := utils.GetEnvOrExit("R2_ACCOUNT_ID")
	base_url := utils.GetEnvOrExit("STORAGE_BASE_URL")

	cfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyId, accessKeySecret, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		log.Error(err.Error())
		os.Exit(1)
	}
	return &R2{
		Bucket: aws.String(bucket),
		s3Client: s3.NewFromConfig(cfg, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountId))
		}),
		log:      log,
		base_url: base_url,
	}
}

// Saves the images in r2 bucket under "imgs/" prefix and returns the public URL
func (r *R2) SaveImage(filename string, image []byte) (string, error) {
	// return unimplemented exception
	key := fmt.Sprintf("imgs/%s", filename)
	response, err := r.s3Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      r.Bucket,
		Key:         aws.String(key),
		Body:        bytes.NewReader(image),
		ContentType: aws.String("image/png"),
	})
	if err != nil {
		return "", errors.New("failed to upload image to R2: " + err.Error())
	}
	r.log.Debug("Image uploaded to R2", "Response", response)
	imageURL := fmt.Sprintf("%s/%s", r.base_url, key)
	return imageURL, nil
}

// Move the image to a different bucket and deletes the original
func (r *R2) SoftDeleteImage(filename string) error {
	// move the file to the  trash bucket 
	key := fmt.Sprintf("imgs/%s", filename)
	resp, err := r.s3Client.CopyObject(context.TODO(), &s3.CopyObjectInput{
		Bucket:     aws.String(*r.Bucket + "-trash"),
		CopySource: aws.String(*r.Bucket + "/" + key),
		Key:        aws.String(key),
	})
	if err != nil {
		return errors.New("failed to soft delete image in R2: " + err.Error())
	}
	r.log.Debug("Image soft deleted in R2", "Response", resp)
	// delete the original file
	_, err = r.s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: r.Bucket,
		Key:    aws.String(key),
	})
	if err != nil {
		return errors.New("failed to delete original image after soft delete in R2: " + err.Error())
	}
	return nil
}

// Rename the image by copying it to a new key and deleting the old one
func (r *R2) RenameImage(oldFilename string, newFilename string) (string, error) {
	srcKey := fmt.Sprintf("imgs/%s", oldFilename)
	dstKey := fmt.Sprintf("imgs/%s", newFilename)

	// Copy the object to the new key
	_, err := r.s3Client.CopyObject(context.TODO(), &s3.CopyObjectInput{
		Bucket:     r.Bucket,
		CopySource: aws.String(*r.Bucket + "/" + srcKey),
		Key:        aws.String(dstKey),
	})
	if err != nil {
		return "", fmt.Errorf("failed to copy image during rename in R2: %w", err)
	}

	// Delete the old object
	_, err = r.s3Client.DeleteObject(context.TODO(), &s3.DeleteObjectInput{
		Bucket: r.Bucket,
		Key:    aws.String(srcKey),
	})
	if err != nil {
		return "", fmt.Errorf("failed to delete old image after rename in R2: %w", err)
	}

	r.log.Debug("Image renamed in R2", "OldKey", srcKey, "NewKey", dstKey)
	imageURL := fmt.Sprintf("%s/%s", r.base_url, dstKey)
	return imageURL, nil

}

func (r *R2) ImageUrl(filename string) string {
	return fmt.Sprintf("%s/imgs/%s", r.base_url, filename)
}