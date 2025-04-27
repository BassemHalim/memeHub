"use client";

import { Meme } from "@/types/Meme";
import { ClipboardCheck, Download, PencilLine, Share2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/utils/tailwind";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { MouseEventHandler, useEffect, useState } from "react";

type variantType = "timeline" | "page";
export default function MemeCard({
    meme,
    variant = "timeline",
}: {
    meme: Meme;
    variant?: variantType;
}) {
    const ShareIcon = <Share2 size={20} className="mx-auto" />;
    const ClipboardIcon = (
        <ClipboardCheck size={20} className="animate-fade-in-scale mx-auto" />
    );
    const [shareLogo, setShareLogo] = useState<JSX.Element>(ShareIcon);
    const [showMobilCtrl, setShowMobilCtrl] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const memeURL = `${process.env.NEXT_PUBLIC_API_HOST}${meme.media_url}`;
    let extraClasses = "";
    if (variant === "timeline") {
        extraClasses = "absolute";
        if (isMobile) {
            extraClasses = cn(extraClasses, "flex");
            if (!showMobilCtrl) {
                extraClasses = "hidden";
            }
        } else {
            extraClasses = cn(extraClasses, "hidden group-hover:flex");
        }
    } else {
        extraClasses = "flex";
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
        e.preventDefault();
        const shareLink = `https://qasrelmemez.com/meme/${meme.id}`;
        navigator.clipboard.writeText(shareLink).then(() => {
            setShareLogo(ClipboardIcon);
            setTimeout(() => {
                setShareLogo(ShareIcon);
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
                // console.log(response.statusText);
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
                    alt={`ميم | رياكشن | ${meme.name}`}
                    height={meme.dimensions[1]}
                    width={meme.dimensions[0]}
                    className="w-full group-hover:scale-105 transition-transform duration-300 ease-in-out"
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
                        className="bg-primary border-transparent text-primary-foreground shadow  rounded-full w-9 h-9 md:w-8 md:h-8"
                    >
                        <Download size={20} className="mx-auto" />
                    </button>
                    <label htmlFor="share-meme-button" className="sr-only">
                        share meme
                    </label>
                    <a
                        href={`https://qasrelmemez.com/meme/${meme.id}`}
                        onClick={handleShare}
                        className="flex justify-center items-center bg-primary border-transparent text-primary-foreground shadow rounded-full w-9 h-9 md:w-8 md:h-8"
                    >
                        {shareLogo}
                    </a>
                    <label htmlFor="edit-meme-button" className="sr-only">
                        edit meme
                    </label>
                    <a
                        className="bg-primary border-transparent text-primary-foreground shadow flex justify-center items-center rounded-full w-9 h-9 md:w-8 md:h-8"
                        href={`/generator?img=${encodeURIComponent(memeURL)}`}
                    >
                        <PencilLine size={20} />
                    </a>
                </div>

                <div
                    className={cn(
                        `bottom-0 left-0 right-0 bg-gray-800/50 text-white p-2 flex-wrap backdrop-blur-sm gap-2 ${
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
