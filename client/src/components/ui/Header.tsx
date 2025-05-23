"use client";
import { Link } from "@/i18n/navigation";
import { SquarePlus, Upload } from "lucide-react";
import Image from "next/image";
import { Suspense, useState } from "react";

import CreateMeme from "@/components/CreateMemeForm";
import { Button } from "@/components/ui/button";
import { sendEvent } from "@/utils/googleAnalytics";
import { useTranslations } from "next-intl";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const showModal = () => {
        setIsOpen(true);
        sendEvent("open_upload_form");
    };

    const t = useTranslations("Home");
    return (
        <>
            <header className="font-bold text-lg text-center p-1 px-4 flex justify-between items-center sticky top-0 bg-[#060c18]/80 z-40 backdrop-blur-md border-b-2 shadow-border">
                <div className="flex justify-start items-center flex-1 text-start gap-2">
                    <Link href="/">{t("title")}</Link>
                    {/* <iframe
                        src="https://ghbtns.com/github-btn.html?user=BassemHalim&repo=memeDB&type=watch&count=true&v=2"
                        width="150"
                        height="20"
                        className=""
                        title="GitHub"
                    ></iframe> */}
                </div>
                <Link href="/" className="flex flex-col justify-center items-center ">
                    <Image
                        className="md:mx-auto my-auto"
                        src="/logo.png"
                        alt="Qasr el Memez"
                        width={70}
                        height={70}
                    />
                </Link>
                <div className="hidden md:flex justify-end items-center gap-4 flex-1 ">
                    {/* <LanguageSwitch /> */}
                    <Button
                        asChild
                        className="bg-primary text-secondary  rounded-lg flex justify-center items-center gap-1"
                    >
                        <Link href={"/generator"}>
                            <p className="md:flex hidden">{t("create")}</p>
                            <SquarePlus size={36} />
                        </Link>
                    </Button>
                    <Button
                        className="bg-primary text-secondary  rounded-lg flex justify-center items-center gap-1"
                        onClick={showModal}
                    >
                        <p className="md:flex hidden">{t("upload")}</p>
                        <Upload />
                    </Button>
                </div>
            </header>
            {process.env.NODE_ENV === "development" && (
                <div className="text-center p-4 bg-red-500">
                    API: {process.env.NEXT_PUBLIC_API_HOST}
                </div>
            )}
            <Suspense>
                <CreateMeme open={isOpen} onOpen={setIsOpen} />
            </Suspense>
        </>
    );
}
