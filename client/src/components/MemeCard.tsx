"use client";

import { Meme } from "@/types/Meme";
import { DownloadOutlined } from "@ant-design/icons";
import Image from "next/image";

const sizeToHeight: Record<string, string> = {
    small: "h-[200px]",
    medium: "h-[300px]",
    large: "h-[400px]",
};

export default function MemeCard({ meme, size }: { meme: Meme; size: string }) {
    meme.media_url = new URL(meme.media_url, "http://localhost:8080").href;
    const handleDownload = async () => {
        try {
            const response = await fetch(meme.media_url, {
                method: "GET",
                headers: {
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Allow-Origin": "*",
                },
                mode: "cors",
            });
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `meme-${meme.id}.jpg`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading meme:", error);
        }
    };
    return (
        <div
            className={`group relative rounded-lg overflow-hidden shadow-lg ${sizeToHeight[size]} w-full`}
        >
            <Image
                src={meme.media_url}
                alt={`Meme ${meme.id}`}
                fill
                className="object-fill"
            />
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
            {/* download button */}
            <button
                onClick={handleDownload}
                className="absolute top-1 right-1 bg-slate-200 text-black rounded-full p-2 flex items-center justify-center w-9 h-9"
            >
                <DownloadOutlined className="text-lg" />
            </button>
        </div>
    );
}
