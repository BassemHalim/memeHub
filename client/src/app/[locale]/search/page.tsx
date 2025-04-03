import SearchComponent from "@/components/searchComponent";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    const t = await getTranslations({ locale: locale, namespace: "Metadata" });

    return {
        title: t("title"),
        description: t("description"),
        openGraph: {
            type: "website",
            url: "https://qasrelmemez.com/search",
            title: t("title"),
            description: t("description"),
            images: [
                {
                    url: "https://qasrelmemez.com/logo.png",
                    width: 588,
                    height: 588,
                    alt: "Qasr El Memez",
                },
            ],
        },
        alternates: {
            canonical:
                "https://www.qasrelmemez.com/search?query=%D9%81%D9%8A%D9%84%D9%85",
            languages: {
                "en-US":
                    "https://www.qasrelmemez.com/en/search?query=%D9%81%D9%8A%D9%84%D9%85",
                "ar-EG":
                    "https://www.qasrelmemez.com/ar/search?query=%D9%81%D9%8A%D9%84%D9%85",
            },
        },
    };
}

export default async function Search({
    searchParams,
}: {
    searchParams: Promise<{ [query: string]: string | undefined }>;
}) {
    const params = await searchParams;
    const query = params.query;
    const tagsParam = params.tags || "";
    const tags = tagsParam.split(",")
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchComponent
                key={[query, ...tags].join("-") || ""}
                query={query || ""}
                selectedTags={tags}
            />
        </Suspense>
    );
}
