.PHONY: proto clean

proto:
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		meme.proto

clean:
	rm -f proto/memeService/*.pb.go
