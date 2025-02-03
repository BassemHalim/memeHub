"use client";
import { useEffect, useState } from "react";
import HeroSearch from "./HeroSearch";
import Meme from "./Meme";
/*
int64 id = 1;
string media_url = 2;
string media_type = 3;
repeated string tags = 4;
*/

type Meme = {
    id: number;
    media_url: string;
    media_type: string;
    tags: string[];
};

const sampleMemes = [
    {
        id: 1,
        media_url: "https://i.redd.it/jv65hih9gbtd1.jpeg",
        media_type: "image/jpeg",
        tags: ["funny", "meme"],
    },
    {
        id: 2,
        media_url: "https://i.redd.it/99vxtugaizpd1.jpeg",
        media_type: "image/jpeg",
        tags: ["de7k", "meme"],
    },
    {
        id: 3,
        media_url: "https://i.redd.it/yq78v9mfmlpd1.jpeg",
        media_type: "image/jpeg",
        tags: ["ha5a", "meme"],
    },
    {
        id: 4,
        media_url:
            "https://media.filfan.com/NewsPics/FilFanNew/Large/273802_0.png",
        media_type: "image/jpeg",
        tags: ["hahaha", "meme"],
    },
    {
        id: 5,
        media_url:
            "https://i.pinimg.com/736x/85/1f/08/851f082ec2bb5011f8f9a729878b0308.jpg",
        media_type: "image/jpeg",
        tags: ["funny", "meme"],
    },
    {
        id: 6,
        media_url:
            "https://i.pinimg.com/736x/2e/7e/9a/2e7e9a919d7537f884e7a777c9e7e589.jpg",
        media_type: "image/jpeg",
        tags: ["de7k", "meme"],
    },
    {
        id: 7,
        media_url:
            "https://i.pinimg.com/474x/ad/97/2a/ad972a156b9e81a6b1ae09488c7481e6.jpg",
        media_type: "image/jpeg",
        tags: ["ha5a", "meme"],
    },
    {
        id: 8,
        media_url: "/restaurant.jpeg",
        media_type: "image/jpeg",
        tags: ["hahaha", "meme"],
    },
];
// infinite scroll timeline of memes
export default function Timeline() {
    const [memes, setMemes] = useState([]);
    useEffect(() => {
        // fetch memes from the server
        function fetchMemes() {
            const URL = process.env.NEXT_PUBLIC_API_HOST + "/memes";
            console.log("fetching memes from", URL);
            fetch(URL)
                .then((response) => response.json())
                .then((data) => {
                    setMemes(data );
                })
                .catch((error) => {
                    console.error("failed to fetch memes", error);
                });
        }
        fetchMemes();
    }, []);
    return (
        <div className="max-w-6xl mx-auto">
            <HeroSearch />
            <div className="flex flex-wrap justify-center mt-4">
                {memes.map((meme) => {
                    return <Meme key={meme.id} meme={meme} />;
                })}
            </div>
        </div>
    );
}
