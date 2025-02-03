curl -X POST \
  -F 'meme={"media_url":"https://placehold.co/600x400/png","mime_type":"image/jpeg","tags":["funny","cats"]};type=application/json'  \
  localhost:8080/api/meme

curl -X POST \
  -F 'meme={"media_url":"","mime_type":"image/jpeg","tags":["funny","cats"]};type=application/json'  \
  -F 'image=@../../memeService/tests/test-image.jpg'\
  localhost:8080/api/meme

