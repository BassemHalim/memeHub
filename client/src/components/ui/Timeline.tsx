"use client";

import { DeleteMeme } from "@/app/meme/meme";
import { useAuth } from "@/auth/authProvider";
import MemeCard from "@/components/ui/MemeCard";
import { Loader2, Trash } from "lucide-react";
import { MasonryProps, useInfiniteLoader } from "masonic";
import dynamic from "next/dynamic";
import { ComponentType, useState } from "react";
import { Meme } from "../../types/Meme";
import { Button } from "./button";

const Masonry: ComponentType<MasonryProps<Meme>> = dynamic(
    () => import("masonic").then((mod) => mod.Masonry),
    { ssr: false }
);

interface TimelineProps {
    memes: Meme[];
    isLoading: boolean;
    hasMore?: boolean;
    next?: () => void;
    admin?: boolean;
}
// if hasMore or next are not provided => infinite scroll will not be rendered
export default function Timeline({
    memes,
    isLoading,
    hasMore = false,
    next = () => {},
    admin = false,
}: TimelineProps) {
    const [lastStartIndex, setLastStartIndex] = useState(-1);
    const auth = useAuth();
    function MasonryItem({
        data,
    }: {
        data: Meme;
        index: number;
        width: number;
    }) {
        return admin ? (
            <div className="border-2 border-primary rounded-lg p-2">
                <Button
                    className="text-red-700"
                    onClick={() => {
                        const response = confirm(
                            `Delete meme with id: ${data.id}`
                        );
                        if (response === true) {
                            DeleteMeme(data.id, auth.token());
                        }
                    }}
                >
                    <Trash />
                </Button>
                <MemeCard meme={data} />
            </div>
        ) : (
            MemeCard({ meme: data })
        );
    }
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
            isItemLoaded: (index, items) => !!items[index],
            minimumBatchSize: 4,
            threshold: 1, // new data should be loaded when the user scrolls within 4 items of the end
            totalItems: hasMore ? memes.length + 1 : memes.length,
        }
    );
    return (
        <section className="container mx-auto py-4 px-4 grow-2">
            <div>
                <Masonry
                    // key={memes[0]?.name + memes[1]?.name || 'empty'}
                    items={memes}
                    render={MasonryItem}
                    columnWidth={350}
                    columnGutter={10}
                    onRender={loadMore}
                    itemKey={(data) => data?.id}
                />

                {isLoading && (
                    <Loader2 className="my-4 h-8 w-8 animate-spin mx-auto" />
                )}
            </div>
        </section>
    );
}
