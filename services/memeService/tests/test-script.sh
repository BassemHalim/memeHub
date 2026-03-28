#!/bin/bash

# Test script for meme service gRPC endpoints with TLS
# Usage: ./test-script.sh

GRPC_HOST="localhost:50051"
PROTO_PATH="proto/memeService/meme.proto"
CA_CERT="cert/ca-cert.pem"
SERVER_NAME="meme-service"

# Common grpcurl flags
GRPC_FLAGS="-cacert $CA_CERT -servername $SERVER_NAME -proto $PROTO_PATH"

echo "Testing meme service gRPC endpoints with TLS..."
echo "================================================"

# Get pending memes
echo -e "\n1. Get pending memes:"
grpcurl $GRPC_FLAGS \
  -d '{"page": 1, "page_size": 10}' \
  $GRPC_HOST meme.MemeService/GetPendingMemes

# Get timeline memes
echo -e "\n2. Get timeline memes:"
grpcurl $GRPC_FLAGS \
  $GRPC_HOST meme.MemeService/GetTimelineMemes

# Get memes by tag
echo -e "\n3. Search memes:"
grpcurl $GRPC_FLAGS \
  -d '{"query":"test", "page":1, "page_size":10}' \
  $GRPC_HOST meme.MemeService/SearchMemes

# Upload meme (uncomment to test)
# IMAGE_B64=$(base64 -w 0 tests/test-image.jpg)
# echo -e "\n4. Upload meme:"
# grpcurl $GRPC_FLAGS \
#   -d "{\"image\": \"$IMAGE_B64\", \"media_type\": \"image/jpeg\", \"tags\": [\"funny\", \"test\"], \"name\": \"test\", \"dimensions\": [10, 10]}" \
#   $GRPC_HOST meme.MemeService/UploadMeme

# Get specific meme (replace ID)
# echo -e "\n5. Get meme by ID:"
# grpcurl $GRPC_FLAGS \
#   -d '{"id": "MEME_ID"}' \
#   $GRPC_HOST meme.MemeService/GetMeme

# Approve meme (replace MEME_ID)
# echo -e "\n6. Approve meme:"
# grpcurl $GRPC_FLAGS \
#   -d '{"meme_id": "MEME_ID"}' \
#   $GRPC_HOST meme.MemeService/ApproveMeme

# Delete meme (replace ID)
# echo -e "\n7. Delete meme:"
# grpcurl $GRPC_FLAGS \
#   -d '{"id": "MEME_ID"}' \
#   $GRPC_HOST meme.MemeService/DeleteMeme

echo -e "\n================================================"
echo "Tests completed!"
