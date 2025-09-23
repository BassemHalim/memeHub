import MemeCard from "@/components/ui/MemeCard";
import Recommendations from "@/components/ui/Recommendations";
import { fetchMemes } from "@/functions/fetchMemes";
import { Meme } from "@/types/Meme";
import { memePagePath } from "@/utils/memeUrl";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>;
}): Promise<Metadata> {
    const { id, locale } = await params;
    const url = new URL(
        `/api/meme/${id}`,
        process.env.NEXT_PUBLIC_API_HOST || ""
    );

    const t = await getTranslations({ locale: locale, namespace: "Metadata" });
    try {
        const response = await fetch(url);
        const meme = (await response.json()) as Meme;
        const tags = new Set(meme.tags.map((tag) => tag.toLowerCase()));
        tags.add(meme.name.toLowerCase());

        const description = `${t("description")} | ` + [...tags].join(" - ");
        return {
            title: `${t("title")} | ${meme.name}`,
            description: description,
            openGraph: {
                type: "article",
                url: `https://qasrelmemez.com${memePagePath(meme)}`,
                title: `${t("title")} | ${meme.name}`,
                description: description,
                images: ["https://qasrelmemez.com" + meme.media_url],
            },
            alternates: {
                canonical: `https://qasrelmemez.com${memePagePath(meme)}`,
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
    params: Promise<{ id: string; locale: string }>;
}) {
    const fetchMeme = async (): Promise<Meme> => {
        let data = null;
        const id = (await params).id;
        const url = new URL(
            `/api/meme/${id}`,
            process.env.NEXT_PUBLIC_API_HOST
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
    // TODO: add a recommendations endpoint and use it here
    // we don't currently have a recommendation system so just fetch some memes from the first 10 pages
    const recommendationsResponse = await fetchMemes(
        Math.floor(Math.random() * 10) + 1,
        4
    );
    const recommendations = recommendationsResponse.memes;
    const locale = (await params).locale;
    if (!meme) notFound();
    return (
        <div className="max-w-full w-[800px] flex flex-col grow p-4">
            <Suspense>
                <div className="flex flex-col gap-4 justify-start">
                    <MemeCard meme={meme} />
                    <Recommendations memes={recommendations} locale={locale} />
                </div>
            </Suspense>
        </div>
    );
}
