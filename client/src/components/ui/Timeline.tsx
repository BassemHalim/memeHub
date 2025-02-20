"use client";

import InfiniteScroll from "@/components/ui/InfiniteScroll";
import MemeCard from "@/components/ui/MemeCard";
import { Meme } from "@/types/Meme";
import { Loader2 } from "lucide-react";
import MasonryGrid from "./MasonryGrid";

interface TimelineProps {
    memes: Meme[];
    isLoading: boolean;
    hasMore?: boolean;
    next?: () => void;
}
// if hasMore or next are not provided => infinite scroll will not be rendered
export default function Timeline({
    memes,
    isLoading,
    hasMore = false,
    next = () => {},
}: TimelineProps) {
    console.log("Rendering timeline");
    console.log(memes, isLoading, hasMore, next);
    return (
        <section className="container mx-auto py-8 px-4 grow-2">
            <div>
                <div className="columns-1 sm:columns-2 lg:columns-4 gap-6">
                {/* <MasonryGrid columns={4} gap={32}> */}
                    {memes.map((meme) => (
                        <div key={meme.id} className="mb-6 break-inside-avoid">
                            <MemeCard meme={meme} size="medium" />
                        </div>
                    ))}
                {/* </MasonryGrid> */}
                </div>

                <InfiniteScroll
                    hasMore={hasMore}
                    isLoading={isLoading}
                    next={next}
                    threshold={1}
                >
                    {hasMore && (
                        <Loader2 className="my-4 h-8 w-8 animate-spin" />
                    )}
                </InfiniteScroll>
            </div>
        </section>
    );
}
