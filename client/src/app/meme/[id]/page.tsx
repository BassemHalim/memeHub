import MemeCard from "@/components/ui/MemeCard";
import { Meme } from "@/types/Meme";
import { Metadata } from "next";
import { Suspense } from "react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}): Promise<Metadata> {
    const id = (await params).id;
    const url = new URL(
        `/api/meme/${id}`,
        process.env.NEXT_PUBLIC_API_HOST || ""
    );

    try {
        const response = await fetch(url);
        const meme = (await response.json()) as Meme;
        const tags = new Set(meme.tags.map((tag) => tag.toLowerCase()));
        tags.add(meme.name.toLowerCase());

        const description =
            "Qasr EL Memez: Home of the best egyptian memes | " +
            [...tags].join(" - ");

        return {
            title: "Qasr El Memez",
            description: description,
            openGraph: {
                images: ["https://qasrelmemez.com" + meme.media_url],
            },
        };
    } catch (error) {
        console.log(error);
        return {
            title: "Qasr El Memez | قصر الميمز",
            description: "Home of the best egyptian memes",
        };
    }
}

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const fetchMeme = async (): Promise<Meme> => {
        let data = null;
        const id = (await params).id;
        const url = new URL(
            `/api/meme/${id}`,
            process.env.NEXT_PUBLIC_API_HOST || ""
        );

        try {
            const response = await fetch(url);
            data = await response.json();
        } catch (error) {
            console.log(error);
        }
        return data as Meme;
    };

    const meme = await fetchMeme();

    if (!meme) return null;

    return (
        <div className="max-w-full w-[800px] self-center">
            <Suspense>
                <MemeCard meme={meme} variant="page" />
            </Suspense>
        </div>
    );
}
