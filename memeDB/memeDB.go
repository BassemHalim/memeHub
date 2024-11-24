package memeDB

import (
	"fmt"
	"log"
	"net/http"
)

func main() {
	router := gin.Default()
	// Set a lower memory limit for multipart forms (default is 32 MiB)
	router.MaxMultipartMemory = 8 << 20 // 8 MiB

	router.GET("/ping", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	router.POST("/image", func(ctx *gin.Context) {
		form, _ := ctx.MultipartForm()
		files, ok := form.File["image"]
		if !ok {
			log.Println("Error: bad request")
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "The request doesn't include an image"})
			return
		}
		fmt.Println("Filename: ", files[0].Filename)
	})
	router.Run(":1234")
}
