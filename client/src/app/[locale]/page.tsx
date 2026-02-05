"use client";
import HeroSearch from "@/components/ui/HeroSearch";
import Timeline from "@/components/ui/Timeline";
import { useMemes } from "@/hooks/useMemes";
import { Link } from "@/i18n/navigation";

export default function Page() {
    const { memes, isLoading, hasMore, next } = useMemes(undefined, 20, "most_downloaded");

    return (
        <div className="w-full flex flex-col flex-1">
            {/* Hidden SEO link for search engine crawling - not visible to users */}
            <Link
                href="/newest"
                className="sr-only"
                aria-label="View newest memes"
            >
                Newest Memes
            </Link>
            <HeroSearch />
            <Timeline
                memes={memes}
                isLoading={isLoading}
                hasMore={hasMore}
                next={next}
                key={memes[0]?.id || "empty"}
            />
        </div>
    );
}
