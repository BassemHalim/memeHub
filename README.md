# MemeHub

A microservice-based meme sharing platform for uploading and searching for relevant memes.

The choice to use a microservice architecture is for learning purposes and is not the most ideal choice.
The memeService currently stores the memes locally

## Architecture:

![system designs](https://github.com/BassemHalim/memeDB/blob/master/docs/System_Design.png?raw=true)

The backend is made of 2 services:

-   **MemeService**: which handles storing and retrieving the memes
-   **Gateway**: acts as a REST client to **MemeService** and handles rate limiting, request validations, serving the images and as a caching layer (not yet implemented)



