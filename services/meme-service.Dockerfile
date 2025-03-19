# Build stage
FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY memeService/ memeService
COPY proto/ proto/
COPY go.mod .
COPY go.sum .

RUN go mod download
RUN go mod tidy




RUN GOOS=linux go build -o /meme-service ./memeService/cmd/memeservice

# Final stage
FROM alpine:latest
WORKDIR /app
COPY --from=builder /meme-service ./meme-service

RUN mkdir -p images 

CMD ["/app/meme-service"]