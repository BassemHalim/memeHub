# Build stage
FROM golang:1.23-alpine AS builder
WORKDIR /app

# Copy required Files
COPY gateway/ gateway
COPY proto/ proto/
COPY rate-limiter/ rate-limiter
COPY go.mod .
COPY go.sum .

RUN go mod download
# the mod file contains dependencies of both services so delete unused 
RUN go mod tidy

WORKDIR /app/gateway

RUN GOOS=linux go build -o /gateway .

# Final stage
FROM alpine:latest
COPY --from=builder /gateway /gateway

WORKDIR /app
RUN mkdir -p images

EXPOSE 8080
CMD ["/gateway"]