import { Meme } from "@/types/Meme";
import { getTranslations } from "next-intl/server";
import RecommendationCard from "./RecommendationCard";

export default async function Recommendations({
    memes,
    locale,
}: {
    memes: Meme[];
    locale?: string;
}) {
    const t = await getTranslations({
        locale: locale || "ar",
        namespace: "MemePage",
    });
    return (
        <>
            <h2 className="text-lg font-bold mb-2">{t("recommendations")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {memes.map((meme) => (
                    <RecommendationCard key={meme.id} meme={meme} />
                ))}
            </div>
        </>
    );
}
