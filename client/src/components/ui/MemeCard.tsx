"use client";

import { Meme } from "@/types/Meme";
import { ClipboardCheck, Download, Share2 } from "lucide-react";

import { cn } from "@/components/lib/utils";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { MouseEventHandler, useEffect, useState } from "react";

type variantType = "timeline" | "page";
export default function MemeCard({
    meme,
    variant = "timeline",
}: {
    meme: Meme;
    variant?: variantType;
}) {
    const [shareLogo, setShareLogo] = useState(<Share2 scale={50} />);
    const [showMobilCtrl, setShowMobilCtrl] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const memeURL = `https://qasrelmemez.com${meme.media_url}`;

    let extraClasses = ""
    if (variant === 'timeline') {
        extraClasses = "absolute"
        if (isMobile) {
            extraClasses = cn(extraClasses, "flex")
            if (!showMobilCtrl) {
                extraClasses = "hidden"
                }
        } else {
            extraClasses = cn(extraClasses, "hidden group-hover:flex")
        }
    } else {
        extraClasses = "flex"
    }


    const parts = meme.media_url.split(".");
    const extension = parts[parts.length - 1];
    const tags = new Set(meme.tags.map((tag) => tag.toLowerCase()));
    tags.add(meme.name.toLowerCase());
    const badges = Array.from(tags);
    useEffect(() => {
        const isMobile = window.matchMedia("(max-width: 600px)").matches;
        setIsMobile(isMobile);
    }, []);
    const handleShare: MouseEventHandler = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(meme.media_url).then(() => {
            setShareLogo(
                <ClipboardCheck scale={50} className="animate-fade-in-scale" />
            );
            setTimeout(() => {
                setShareLogo(<Share2 scale={50} />);
            }, 1500);
        });
    };
    const handleDownload: MouseEventHandler = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(memeURL, {
                method: "GET",
                mode: "cors",
            });
            if (!response.ok) {
                console.log(response.statusText);
                return;
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${meme.name.replaceAll(" ", "_")}.${extension}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading meme:", error);
        }
    };
    return (
        <Card
            className="container relative overflow-hidden shadow-lg  w-full "
            onClick={() => {
                setShowMobilCtrl((prev) => !prev);
            }}
        >
            <div className="relative group">
                <Image
                    src={memeURL}
                    alt={meme.name}
                    height={meme.dimensions[1]}
                    width={meme.dimensions[0]}
                    className="w-full"
                    unoptimized={meme.media_url.endsWith(".gif")}
                />
                <div
                    className={cn(
                        "absolute top-1 right-2 m-2 space-x-2",
                        extraClasses
                    )}
                >
                    <label htmlFor="download-meme-button" className="sr-only">
                        download meme
                    </label>
                    <button
                        id="download-meme-button"
                        onClick={handleDownload}
                        className="bg-primary border-transparent bg-primary text-primary-foreground shadow  rounded-full p-2 flex items-center justify-center w-8 h-8"
                    >
                        <Download scale={50} />
                    </button>
                    <label htmlFor="share-meme-button" className="sr-only">
                        share meme
                    </label>
                    <button
                        onClick={handleShare}
                        className="bg-primary border-transparent bg-primary text-primary-foreground shadow  rounded-full p-2 flex items-center justify-center w-8 h-8"
                    >
                        {shareLogo}
                    </button>
                </div>

                <div
                    className={cn(
                        `bottom-0 left-0 right-0 bg-gray-800/50 text-white p-2 flex-wrap backdrop-blur-sm space-x-2 ${
                            variant === "page"
                                ? "text-lg font-bold p-3"
                                : "text-xs"
                        } `,
                        extraClasses
                    )}
                >
                    {badges.map((tag: string) => {
                        return (
                            <Link
                                href={
                                    "/search?" +
                                    new URLSearchParams([["query", tag]])
                                }
                                key={tag}
                                className="my-[2px] hover:text-amber-400"
                                dir={
                                    /[\u0600-\u06FF]/.test(tag) ? "rtl" : "ltr"
                                }
                            >
                                #{tag.replaceAll(" ", "_")}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </Card>
    );
}
