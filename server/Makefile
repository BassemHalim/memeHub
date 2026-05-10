.PHONY: db-up db-down server-up start stop gateway moderator

COMPOSE = sudo docker compose -f $(shell pwd)/docker-compose.yml

db-up:
	$(COMPOSE) up postgres -d
db-down:
	$(COMPOSE) stop postgres

server-up:
	ln -s config/config.yaml .
	export $(cat 'memeService/.env' | xargs) && go run cmd/memesHub/memesHub.go

docker-up:
	$(COMPOSE) up server

local: db-up server-up

server: server-up

stop: db-down
	rm config.yaml
