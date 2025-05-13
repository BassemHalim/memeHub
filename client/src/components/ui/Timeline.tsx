"use client";

import * as Memes from "@/app/meme/crud";
import { useAuth } from "@/auth/authProvider";
import MemeCard from "@/components/ui/MemeCard";
import { Edit, Loader2, Trash } from "lucide-react";
import { MasonryProps, useInfiniteLoader } from "masonic";
import dynamic from "next/dynamic";
import { ComponentType, useCallback, useRef, useState } from "react";
import { Meme } from "../../types/Meme";
import UpdateMeme from "../UpdateMemeForm";
import { Button } from "./button";

const Masonry: ComponentType<MasonryProps<Meme>> = dynamic(
    () => import("masonic").then((mod) => mod.Masonry),
    { ssr: false },
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
    const [editMeme, setEditMeme] = useState("");
    const auth = useAuth();
    const lastLoadedIndex = useRef(0);

    const MasonryItem = useCallback(
        ({ data }: { data: Meme; index: number; width: number }) => {
            return admin ? (
                <div className="border-2 border-primary rounded-lg p-2">
                    <div className="flex justify-center gap-2 m-2">
                        <Button
                            className="text-red-700"
                            onClick={() => {
                                const response = confirm(
                                    `Delete meme with id: ${data.id}`,
                                );
                                if (response === true) {
                                    Memes.Delete(data.id, auth.token() ?? "");
                                }
                            }}
                        >
                            <Trash />
                        </Button>
                        <Button
                            onClick={() => {
                                setEditMeme(data.id);
                            }}
                        >
                            <Edit />
                        </Button>
                    </div>
                    <UpdateMeme
                        meme={data}
                        open={editMeme === data.id}
                        onOpen={() => {
                            setEditMeme("");
                        }}
                    />
                    <MemeCard meme={data} />
                </div>
            ) : (
                <MemeCard meme={data} />
            );
        },
        [admin, auth, editMeme],
    );
    const maybeLoadMore = useInfiniteLoader(
        async (_startIndex, stopIndex, _currItems) => {
            /**
             * Load Items items[startIndex:stopIndex+1] from the server
             * it will get called multiple times on the same start and stop index hence the lastLoadedIndex ref
             */

            if (isLoading || lastLoadedIndex.current >= stopIndex) {
                return;
            }
            if (!hasMore) {
                console.log("No more items to load");
                return;
            }
            lastLoadedIndex.current = stopIndex;
            next();
        },
        {
            isItemLoaded: (index, items) => !!items[index],
            minimumBatchSize: 20,
            threshold: 1, // new data should be loaded when the user scrolls within 4 items of the end
        },
    );
    return (
        <section className="container mx-auto py-4 px-4 grow-2">
            <div>
                <Masonry
                    // key={memes[0]?.id}
                    items={memes}
                    render={MasonryItem}
                    columnWidth={350}
                    columnGutter={10}
                    onRender={maybeLoadMore}
                    itemKey={(data) => data?.id ?? ""}
                />

                {isLoading && (
                    <Loader2 className="my-4 h-8 w-8 animate-spin mx-auto" />
                )}
            </div>
        </section>
    );
}
