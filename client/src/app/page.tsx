"use client";

import HeroSearch from "@/components/ui/HeroSearch";
import Timeline from "@/components/ui/Timeline";
import { useFetchMemes } from "@/hooks/useFetchMemes";

export default function Home() {
    const { memes, isLoading, hasMore, next } = useFetchMemes();

    return (
        <section className="w-full flex flex-col">
            <HeroSearch />
            <Timeline
                memes={memes}
                isLoading={isLoading}
                hasMore={hasMore}
                next={next}
            />
        </section>
    );
}
