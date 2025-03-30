.PHONY: docker-up docker-down server-up start stop gateway moderator

docker-up:
	sudo docker compose -f development.docker-compose.yml up postgres -d 
docker-down:
	sudo docker compose down
server-up:
	go run memeService/cmd/memeservice/server.go || true
gateway:
	export $$(cat 'gateway/.env' | xargs) && go run gateway/cmd/memes_api/main.go
moderator:
	export $$(cat 'moderator/.env' | xargs) && go run moderator/moderator.go
server: docker-up server-up

stop: docker-down

certs:
	cd cert; ./gen.sh; cd ..