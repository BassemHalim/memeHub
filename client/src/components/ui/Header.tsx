"use client";
import { Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";

import UploadMemeForm from "@/components/UploadMemeForm";
import { sendGTMEvent } from "@next/third-parties/google";

import { Button } from "@/components/ui/button";
import LanguageSwitch from "@/components/ui/languageSwitch";
import { useTranslations } from "next-intl";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const showModal = () => {
        setIsOpen(true);
        sendGTMEvent({ event: "meme-upload" });
    };
    const t = useTranslations("Home");
    return (
        <>
            <header className="font-bold text-lg text-center p-1 px-4 flex justify-between items-center sticky top-0 bg-[#060c18]/80 z-10 backdrop-blur-md border-b-2 shadow-border">
                <Link href="/" className="hidden md:block flex-1 text-start ">
                    {t("title")}
                </Link>
                <Link href="/" className="flex-1">
                    <Image
                        className="md:mx-auto my-auto"
                        src="/logo.png"
                        alt="Qasr el Memez"
                        width={70}
                        height={70}
                    />
                </Link>
                <div className="flex justify-end items-center gap-4 flex-1 ">
                    <LanguageSwitch />
                    <Button
                        className="bg-primary text-secondary p-1 px-2 py-1 rounded-lg flex justify-center items-center gap-2"
                        onClick={showModal}
                    >
                        {t("upload")} <Upload />
                    </Button>
                </div>
            </header>
            <Suspense>
                <UploadMemeForm open={isOpen} onOpen={setIsOpen} />
            </Suspense>
        </>
    );
}
