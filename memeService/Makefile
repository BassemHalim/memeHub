.PHONY: docker-up docker-down server-up

docker-up:
	sudo docker compose up --build -d
docker-down:
	sudo docker compose down
server-up:
	go run src/main.go
start: docker-up server-up
stop: docker-down

