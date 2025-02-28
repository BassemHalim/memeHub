"use client";

import MemeCard from "@/components/ui/MemeCard";
import { Meme } from "@/types/Meme";
import { Suspense, useEffect, useState } from "react";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
    const [meme, setMeme] = useState<Meme | null>(null);

    useEffect(() => {
        const fetchMeme = async () => {
            const id = (await params).id;
            const url = new URL(
                `/api/meme/${id}`,
                process.env.NEXT_PUBLIC_API_HOST || ""
            );

            try {
                const response = await fetch(url);
                const data = await response.json();
                setMeme(data);
            } catch (error) {
                console.log(error);
            }
        };

        fetchMeme();
    }, [params]);

    if (!meme) return null;

    return (
        <Suspense>
            <div className="max-w-xl self-center">
                <MemeCard meme={meme} size="md" />
            </div>
        </Suspense>
    );
}
