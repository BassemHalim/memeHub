import SearchComponent from "@/components/searchComponent";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

type Props = {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params, searchParams }: Props) {
    const { locale } = await params;
    const t = await getTranslations({ locale: locale, namespace: "Metadata" });
    const paramsObj = await searchParams;
    return {
        title: t("title") + " - " + paramsObj.query,
        description: t("description"),
        openGraph: {
            type: "website",
            url: "https://qasrelmemez.com/search",
            title: t("title"),
            description: t("description"),
            images: [
                {
                    url: "https://qasrelmemez.com/og.png",
                    width: 1200,
                    height: 630,
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
                    "https://www.qasrelmemez.com/search?query=%D9%81%D9%8A%D9%84%D9%85",
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
    const tags = tagsParam.split(",");
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
