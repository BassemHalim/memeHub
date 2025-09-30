import fetchMeme from "@/functions/fetchMeme";
import { Meme } from "@/types/Meme";
import { memePagePath } from "@/utils/memeUrl";
import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect, RedirectType } from "next/navigation";

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
                url: `https://qasrelmemez.com/meme/${id}`,
                title: t("title"),
                description: description,
                images: ["https://qasrelmemez.com" + meme.media_url],
            },
            alternates: {
                canonical: `https://qasrelmemez.com/meme/${id}`,
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
    const { id } = await params;
    const meme = await fetchMeme(id);
    if (!meme) notFound();
    const dest = memePagePath(meme);
    permanentRedirect(dest, RedirectType.replace);
}
