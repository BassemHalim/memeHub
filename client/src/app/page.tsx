"use client";

import HeroSearch from "@/components/HeroSearch";
import Timeline from "@/components/Timeline";
import { useFetchMemes } from "@/hooks/useFetchMemes";

export default function Home() {
    const { memes, isLoading } = useFetchMemes();
    return (
        <section className="w-full flex flex-col">
            <HeroSearch />
            <Timeline memes={memes} isLoading={isLoading} />
        </section>
    );
}
