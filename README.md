# MemeHub

## **This is a Work in Progress Project**

A microservice-based meme sharing platform for uploading and searching for relevant memes.

The choice to use a microservice architecture is for learning purposes and is not the most ideal choice.
The memeService currently stores the memes locally

## Architecture:

![system designs](https://github.com/BassemHalim/memeDB/blob/master/docs/System_Design.png?raw=true)

The backend is made of 2 services:

-   **MemeService**: which handles storing and retrieving the memes
-   **Gateway**: acts as a REST client to **MemeService** and handles rate limiting, request validations, serving the images and as a caching layer (not yet implemented)

## TODO:

-   [ ] determine if a similar meme already exists (https://github.com/qarmin/czkawka)
-   [ ] moderation/filtering offensive content WIP
-   [ ] compress images using ffmpeg
-   [ ] add tests WIP
-   [x] meme generator: option to add top or bottom padding 
-   [x] use viper for configs
-   [x] integrate with grafana + prometheus (done in feature/metrics but won't use)
  
## Nice to Have:
-   [ ] require uploading a new meme to download more than x memes per day to promote uploading content
-   [ ] add connections between memes to suggest similar images (i.e. a template image and its memes)
-   [ ] use ocr to get text from images
-   [ ] Upvote memes

