#!/bin/bash

IMAGE_B64=$(base64 -w 0 tests/test-image.jpg)
# Upload meme
grpcurl -plaintext \                                                                        
  -proto proto/memeService/meme.proto \
  -d "{\"image\": \"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=\", \"media_type\": \"image/jpeg\", \"tags\": [\"funny\", \"test\"], \"name\": \"test\", \"dimensions\": [10, 10]}" \
  localhost:50051 \
  meme.MemeService/UploadMeme

# Get meme
grpcurl -plaintext -proto proto/memeService/meme.proto -d '{"id": 23}' \
  localhost:50051 meme.MemeService/GetMeme

# Get memes by tag
grpcurl -plaintext -proto proto/memeService/meme.proto -d '{"tags":["funny", "test"], "match_type":"ANY", "page":1, "page_size":10, "sort_order":"NEWEST"}' localhost:50051 meme.MemeService/FilterMemesByTags 

// Delete meme
grpcurl -plaintext -proto proto/memeService/meme.proto -d '{"id": 24}' \
  localhost:50051 meme.MemeService/DeleteMeme

# Timeline 
grpcurl -plaintext -proto proto/memeService/meme.proto \
  localhost:50051 meme.MemeService/GetTimelineMemes;