"use client";

import { Meme } from "@/types/Meme";
import Image from "next/image";

const sizeToHeight: Record<string, string> = {
    small: "h-[200px]",
    medium: "h-[300px]",
    large: "h-[400px]",
};

export default function MemeCard({ meme, size }: { meme: Meme; size: string }) {
    meme.media_url = new URL(meme.media_url, "http://localhost:8080").href;
    console.log("Meme URL", meme.media_url);
    return (
        <div
            className={`relative rounded-lg overflow-hidden shadow-lg ${sizeToHeight[size]} w-full`}
        >
            <Image
                src={meme.media_url}
                alt={`Meme ${meme.id}`}
                fill
                className="object-fill"
            />
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/50 backdrop-blur-sm">
                <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-50 text-white text-xs p-2 group-hover:hidden">
                    {meme.tags.map((tag: string) => {
                        return (
                            <span
                                key={tag}
                                className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full m-1"
                            >
                                {tag}
                            </span>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
