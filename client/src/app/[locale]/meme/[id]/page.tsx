import fetchMeme from "@/functions/fetchMeme";
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

    const t = await getTranslations({ locale: locale, namespace: "Metadata" });
    try {
        const meme = await fetchMeme(id);
        if (!meme) throw new Error("Meme not found");
        const tags = new Set(meme.tags.map((tag) => tag.toLowerCase()));
        tags.add(meme.name.toLowerCase());

        const description = `${t("description")} | ` + [...tags].join(" - ");
        const imageUrl = meme.media_url.startsWith("http")
            ? meme.media_url
            : "https://qasrelmemez.com" + meme.media_url;
        return {
            title: `${t("title")} | ${meme.name}`,
            description: description,
            openGraph: {
                type: "article",
                url: `https://qasrelmemez.com/meme/${id}`,
                title: t("title"),
                description: description,
                images: [imageUrl],
            },
            alternates: {
                canonical: `https://qasrelmemez.com/meme/${id}`,
            },
        };
    } catch (error) {
        console.log(error);
        const description = t("description");
        return {
            title: "Qasr El Memez | قصر الميمز",
            description: description,
            openGraph: {
                type: "article",
                url: `https://qasrelmemez.com/meme/${id}`,
                title: t("title"),
                description: description,
            },
            alternates: {
                canonical: `https://qasrelmemez.com/meme/${id}`,
            },
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
