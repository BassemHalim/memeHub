"use client";
import HeroSearch from "@/components/ui/HeroSearch";
import Timeline from "@/components/ui/Timeline";
import { useMemes } from "@/hooks/useMemes";

export default function NewestPage() {
    const { memes, isLoading, hasMore, next } = useMemes(undefined, 20, "newest");

    return (
        <div className="w-full flex flex-col flex-1">
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