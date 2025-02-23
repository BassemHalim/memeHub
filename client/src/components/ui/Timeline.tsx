"use client";

import MemeCard from "@/components/ui/MemeCard";
import { Loader2 } from "lucide-react";
import { MasonryProps, useInfiniteLoader } from "masonic";
import dynamic from "next/dynamic";
import { ComponentType, useState } from "react";
import { Meme } from "../../types/Meme";

function MasonryItem({ data }: { data: Meme; index: number; width: number }) {
    return MemeCard({ meme: data, size: "medium" });
}
const Masonry: ComponentType<MasonryProps<Meme>> = dynamic(
    () => import("masonic").then((mod) => mod.Masonry),
    { ssr: false }
);

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
    const [lastStartIndex, setLastStartIndex] = useState(-1);
    const loadMore = useInfiniteLoader(
        async (startIndex) => {
            if (lastStartIndex === startIndex || isLoading) {
                return;
            }
            setLastStartIndex(startIndex);
            if (!hasMore) {
                console.log("No more items to load");
                return;
            }
            next();
        },

        {
            isItemLoaded: (index, items) =>
                hasMore ? (index < items.length ? true : false) : true,
            minimumBatchSize: 4,
            threshold: 1, // new data should be loaded when the user scrolls within 4 items of the end
            // totalItems: 50
        }
    );
    return (
        <section className="container mx-auto py-8 px-4 grow-2">
            <div>
                <Masonry
                    items={memes}
                    render={MasonryItem}
                    columnWidth={350}
                    columnGutter={20}
                    onRender={loadMore}
                    itemKey={(data) => data.id}
                />

                {isLoading && (
                    <Loader2 className="my-4 h-8 w-8 animate-spin mx-auto" />
                )}
            </div>
        </section>
    );
}
