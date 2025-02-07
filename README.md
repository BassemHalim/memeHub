# MemeHub

A microservice-based meme sharing platform for uploading and searching for relevant memes.

**Work in Progress**
This is a work in progress project. The service can currently upload memes and list all memes. The search functionality is still being implemented

The choice to use a microservice architecture is for learning purposes and is not the most ideal choice.
The memeService currently stores the memes locally

## Technologies:
### Backend:
    - Go
    - PostgreSQL
    - gRPC
### Frontend:
    - Next.js
    - TypeScript
    - TailwindCSS
    - ant.design

## Architecture:
The backend is made of 2 services:
    **MemeService**: which handles storing and retrieving the memes
    **Gateway**: acts as a REST client to **MemeService** and handles rate limiting, request validations, serving the images and as a caching layer (not yet implemented)

    
