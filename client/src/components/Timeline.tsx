"use client";

import MemeCard from "@/components/MemeCard";
import { Meme } from "@/types/Meme";
import { LoaderCircle } from "lucide-react";

interface TimelineProps {
    memes: Meme[];
    isLoading: boolean;
}
export default function Timeline({ memes, isLoading }: TimelineProps) {
    return (
        <section className="container mx-auto py-8 px-4 grow-2">
            {!isLoading ? (
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
                    {memes.map((meme) => (
                        <div key={meme.id} className="mb-6 break-inside-avoid">
                            <MemeCard meme={meme} size="medium" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex justify-center items-center">
                    <LoaderCircle className="animate-spin" />
                </div>
            )}
        </section>
    );
}
