# Build stage
FROM golang:1.24-alpine AS builder
WORKDIR /app

# Copy required Files
COPY . . 

RUN go mod download
# the mod file contains dependencies of both services so delete unused 
RUN go mod tidy

RUN GOOS=linux go build -o server ./cmd/memesHub

# Final stage
FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/server /app

RUN mkdir -p images

EXPOSE 8080
CMD ["/app/server"]