#!/bin/bash

IMAGE_B64=$(base64 -w 0 tests/test-image.jpg)
# Upload meme
grpcurl -plaintext \
  -proto proto/meme.proto \
  -d "{\"image\": \"$IMAGE_B64\", \"media_type\": \"image/jpeg\", \"tags\": [\"funny\", \"test\"]}" \
  localhost:50051 \
  meme.MemeService/UploadMeme

# Get meme
grpcurl -plaintext -proto proto/meme.proto -d '{"id": 1}' \
  localhost:50051 meme.MemeService/GetMeme

# Get memes by tag
grpcurl -plaintext -proto proto/meme.proto -d '{"tags":["funny"], "match_type":"ANY", "page":1, "page_size":10, "sort_order":"NEWEST"}' localhost:50051 meme.MemeService/FilterMemesByTags 