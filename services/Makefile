.PHONY: db-up db-down server-up start stop gateway moderator

db-up:
	sudo docker compose -f development.docker-compose.yml up postgres -d 
db-down:
	sudo docker compose down
server-up:
	go run memeService/cmd/memeservice/server.go || true
gateway:
	export $$(cat 'gateway/.env' | xargs) && go run gateway/cmd/memes_api/main.go
moderator:
	export $$(cat 'moderator/.env' | xargs) && go run moderator/moderator.go
server: db-up server-up

stop: db-down

certs-docker: 
	cd cert; \
	echo "subjectAltName = IP:0.0.0.0,DNS:meme-service" > server-ext.cnf; \
	./gen.sh; \
	cd .. \

certs-local: 
	cd cert; \
	echo "subjectAltName = IP:0.0.0.0,DNS:localhost" > server-ext.cnf; \
	./gen.sh; \
	cd .. \