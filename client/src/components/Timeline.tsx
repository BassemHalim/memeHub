"use client";

import HeroSearch from "@/components/HeroSearch";
import MemeCard from "@/components/MemeCard";
import { Meme, MemesResponse } from "@/types/Meme";
import { useEffect, useState } from "react";
// const memes: Meme[] = sampleMemes;
// const sizes = ["small", "medium", "large"];

export default function Home() {
    const [memes, setMemes] = useState<Meme[]>([]);

    useEffect(() => {
        // fetch memes from the server
        function fetchMemes() {
            const URL = process.env.NEXT_PUBLIC_API_HOST + "/memes";
            console.log("fetching memes from", URL);
            fetch(URL)
                .then((response) => {
                    if (!response.ok) {
                        console.log("failed to fetch resource");
                        throw new Error("failed to fetch memes");
                    }
                    return response.json();
                })
                .then((data) => {
                    const memeResp = data as MemesResponse;
                    console.log(memeResp);
                    setMemes(memeResp.memes);
                })
                .catch((error) => {
                    console.log("failed to fetch memes", error);
                });
        }
        fetchMemes();
    }, []);
    return (
        <div className="w-full flex flex-col">
            <HeroSearch />
            <section className="container mx-auto py-8 px-4 grow-2">
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
                    {memes.map((meme) => (
                        <div key={meme.id} className="mb-6 break-inside-avoid">
                            <MemeCard
                                meme={meme}
                                // size={sizes[Math.floor(Math.random() * 3)]}
                                size="medium"
                            />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
