"use client";

import HeroSearch from "@/components/HeroSearch";
import MemeCard from "@/components/MemeCard";
import { Meme } from "@/types/Meme";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
// const sizes = ["small", "medium", "large"];

interface TimelineProps {
    memes: Meme[];
    setMemes: Dispatch<SetStateAction<Meme[]>>;
    isLoading: boolean;
    error: string | null;
}
export default function Timeline({ memes, setMemes, isLoading }: TimelineProps) {
    const [timelineMemes, setTimelineMemes] = useState<Meme[]>([])
    useEffect(() => {
        if (!isLoading) {
            setTimelineMemes(memes)
        }
    }, [isLoading])

    return (
        <div className="w-full flex flex-col">
            <HeroSearch setMemes={setMemes} timelineMemes={timelineMemes} />
            <section className="container mx-auto py-8 px-4 grow-2">
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
                    {memes.map((meme) => (
                        <div key={meme.id} className="mb-6 break-inside-avoid">
                            <MemeCard
                                meme={meme}
                                size="medium"
                            />
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
