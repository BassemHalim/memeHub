# Build stage
FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY memeService/ memeService
COPY proto/ proto/
COPY go.mod .
COPY go.sum .

RUN go mod download
RUN go mod tidy

WORKDIR /app/memeService/src

RUN CGO_ENABLED=0 GOOS=linux go build -o /meme-service .

# Final stage
FROM alpine:latest
COPY --from=builder /meme-service /meme-service

CMD ["/meme-service"]