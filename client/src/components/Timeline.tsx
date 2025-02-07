"use client";

import MemeCard from "@/components/MemeCard";
import { Meme, MemesResponse } from "@/types/Meme";
import { Search } from "lucide-react";
import Image from "next/image";
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
        <div className="w-full">
            <section className="relative h-[400px] w-full mb-12">
                <div className="absolute inset-0">
                    <Image
                        src="/ali_rabi3.jpg"
                        height={500}
                        width={1000}
                        alt="Ali Rabi3 meme"
                        className="w-full h-full object-fill brightness-50"
                    />
                </div>
                <div className="relative h-full flex flex-col items-center justify-center px-4">
                    <h1 className="text-5xl font-bold text-white mb-6 text-center">
                        House of Memes
                    </h1>
                    <div className="w-full max-w-2xl relative">
                        <input
                            type="text"
                            placeholder="Search memes..."
                            className="w-full px-6 py-4 rounded-full text-lg shadow-lg pl-14"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-6 w-6" />
                    </div>
                </div>
            </section>

            <main className="container mx-auto py-8 px-4">
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
            </main>
        </div>
    );
}
