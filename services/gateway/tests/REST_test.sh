curl -X POST \
  -F 'meme={"media_url":"https://placehold.co/600x400/png","mime_type":"image/jpeg","tags":["funny","cats"], "name": "meme"};type=application/json'  \
  localhost:8080/api/meme

curl -X POST \
  -F 'meme={"media_url":"","mime_type":"image/jpeg","tags":["funny","cats"], "name": "meme"};type=application/json'  \
  -F 'image=@../../memeService/tests/test-image.jpg'\
  localhost:8080/api/meme

curl -X POST \
  -F 'meme={"media_url":"https://placehold.co/400x600/png","mime_type":"image/jpeg","tags":["funny","cats"], "name":"name"};type=application/json'  \
   \localhost:8080/api/meme

curl -X POST \
  -F 'meme={"media_url":"https://placehold.co/400x600/png","mime_type":"image/jpeg","tags":["funny","cats"], "name":"name"};type=application/json'  \
   \localhost:8080/api/memes

curl -X GET 'http://localhost:8080/api/memes?tags=funny&tags=doctor&size=5&page=1&match=any&sort=newest' | jq

curl -X GET 'http://localhost:8080/api/memes/search?query=linkedin' | jq

 curl -X DELETE http://localhost:8080/api/meme/084d71b0-af7d-40f0-a7af-38f1224280f3 \
-H 'Authorization: Bearer token'