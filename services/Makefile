.PHONY: docker-up docker-down server-up start stop gateway

docker-up:
	sudo docker compose -f development.docker-compose.yml up postgres -d 
docker-down:
	sudo docker compose down
server-up:
	go run memeService/cmd/memeservice/server.go || true
gateway:
	GRPC_HOST=localhost GRPC_PORT=50051 go run gateway/cmd/memes_api/main.go
server: docker-up server-up

stop: docker-down

certs:
	cd cert; ./gen.sh; cd ..