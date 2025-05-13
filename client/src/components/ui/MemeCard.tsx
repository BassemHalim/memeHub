"use client";

import { Meme } from "@/types/Meme";
import { ClipboardCheck, Download, PencilLine, Share2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { sendEvent } from "@/utils/googleAnalytics";
import { cn } from "@/utils/tailwind";
import Image from "next/image";
import { MouseEventHandler, useEffect, useState } from "react";

function logDownloadEvent(meme: Meme) {
    sendEvent("meme_download", { meme_id: meme.id });
}
function logShareEvent(meme: Meme) {
    sendEvent("meme_share", { meme_id: meme.id });
}

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
    const [showMobilCtrl, setShowMobilCtrl] = useState(true);
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
    const badges = Array.from(tags);
    useEffect(() => {
        const isMobile = window.matchMedia("(max-width: 600px)").matches;
        setIsMobile(isMobile);
    }, []);

    const handleShare: MouseEventHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        logShareEvent(meme);
        const shareLink = `https://qasrelmemez.com/meme/${meme.id}`;
        navigator.clipboard.writeText(shareLink).then(() => {
            setShareLogo(ClipboardIcon);
            setTimeout(() => {
                setShareLogo(ShareIcon);
            }, 1500);
        });
    };
    const handleDownload: MouseEventHandler = async (e) => {
        // send analytics event
        logDownloadEvent(meme);
        e.stopPropagation();
        try {
            const response = await fetch(memeURL, {
                method: "GET",
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
                <div className="absolute w-full h-full inset-0p z-10"></div>
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
                        "absolute top-1 right-2 m-2 space-x-2 z-10",
                        extraClasses,
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
                    {!meme.media_type.endsWith("gif") && (
                        <>
                            <label
                                htmlFor="edit-meme-button"
                                className="sr-only"
                            >
                                edit meme
                            </label>
                            <a
                                className="bg-primary border-transparent text-primary-foreground shadow flex justify-center items-center rounded-full w-9 h-9 md:w-8 md:h-8"
                                href={`/generator?img=${encodeURIComponent(
                                    memeURL,
                                )}`}
                            >
                                <PencilLine size={20} />
                            </a>
                        </>
                    )}
                </div>

                <div
                    className={cn(
                        `bottom-0 left-0 right-0 bg-gray-800/50 text-white p-2 backdrop-blur-sm flex flex-col gap-2 z-10 ${
                            variant === "page"
                                ? "text-lg font-bold p-3"
                                : "text-xs"
                        } `,
                        extraClasses,
                    )}
                >
                    <Link
                        href={
                            "/search?" +
                            new URLSearchParams([["query", meme.name]])
                        }
                        className="font-bold text-sm hover:text-amber-400"
                    >
                        {meme.name}
                    </Link>
                    <div className="flex flex-wrap gap-2 ">
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
                                        /[\u0600-\u06FF]/.test(tag)
                                            ? "rtl"
                                            : "ltr"
                                    }
                                >
                                    #{tag.replaceAll(" ", "_")}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Card>
    );
}
