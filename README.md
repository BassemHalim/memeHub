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

TODO:

-   [x] endpoint to get tags based on a query
-   [x] Refactor go to follow recommended project structure /cmd /internal etc. (gateway done)
-   [x] endpoint to delete a meme
-   [x] meme page
-   [x] ar/en switch
-   [x] endpoint to update a meme tags or name
-   [x] caching timeline
-   [x] image editing UI
-   [x] caching timeline server-side
-   [ ] search page filters UI WIP (feat/search-page-filters)
-   [ ] determine if a similar meme already exists (https://github.com/qarmin/czkawka)
-   [ ] use ocr to get text from images
-   [ ] filtering offensive content WIP
-   [ ] compress images
-   [ ] add tests WIP
-   [ ] Upvote memes
-   [ ] display upload file in upload form