import MemeCard from "@/components/ui/MemeCard";
import { Meme } from "@/types/Meme";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
            title: t("title"),
            description: description,
            openGraph: {
                type: "website",
                url: `https://qasrelmemez.com/meme/${id}`,
                title: t("title"),
                description: description,
                images: ["https://qasrelmemez.com" + meme.media_url],
            },
            alternates: {
                canonical: `https://qasrelmemez.com/ar/meme/${id}`,

                languages: {
                    "en-US": `https://qasrelmemez.com/en/meme/${id}`,
                    "ar-EG": `https://qasrelmemez.com/ar/meme/${id}`,
                },
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
