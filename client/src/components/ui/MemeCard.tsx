import { Meme } from "@/types/Meme";
import { ClipboardCheck, Download, Share2 } from "lucide-react";

import { cn } from "@/components/lib/utils";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { MouseEventHandler, useState } from "react";

export default function MemeCard({ meme }: { meme: Meme; size: string }) {
    const [shareLogo, setShareLogo] = useState(<Share2 scale={50} />);
    const [showMobilCtrl, setShowMobilCtrl] = useState(true);
    const isMobile = window.matchMedia("(max-width: 600px)").matches;
    const controlsClass = isMobile
        ? showMobilCtrl
            ? "flex"
            : "hidden"
        : "group-hover:flex hidden";
    meme.media_url = new URL(meme.media_url, "https://qasrelmemez.com").href;
    const parts = meme.media_url.split(".");
    const extension = parts[parts.length - 1];
    // console.log("Media URL", meme.media_url)
    const tags = new Set(meme.tags.map((tag) => tag.toLowerCase()));
    tags.add(meme.name.toLowerCase());
    const badges = Array.from(tags);
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
            const response = await fetch(meme.media_url, {
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
                    src={meme.media_url}
                    alt={meme.name}
                    height={meme.dimensions[1]}
                    width={meme.dimensions[0]}
                    className="w-full"
                    unoptimized={meme.media_url.endsWith(".gif")}
                />
                <div
                    className={cn(
                        "sm:hidden absolute top-1 right-2 m-2 space-x-2",
                        controlsClass
                    )}
                >
                    <button
                        onClick={handleDownload}
                        className="bg-primary border-transparent bg-primary text-primary-foreground shadow  rounded-full p-2 flex items-center justify-center w-8 h-8"
                    >
                        <Download scale={50} />
                    </button>
                    <button
                        onClick={handleShare}
                        className="bg-primary border-transparent bg-primary text-primary-foreground shadow  rounded-full p-2 flex items-center justify-center w-8 h-8"
                    >
                        {shareLogo}
                    </button>
                </div>

                {/* <div className="flex items-center flex-wrap p-2"> */}
                <div
                    className={cn(
                        "sm:hidden absolute bottom-0 left-0 right-0 bg-gray-800/50 text-white text-xs p-2 flex-wrap backdrop-blur-sm ",
                        controlsClass
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
                                className="text-xs mx-[4px] my-[2px] hover:text-amber-400"
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
