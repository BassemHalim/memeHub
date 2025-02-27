"use client";
import { Upload } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";

import UploadMemeForm from "@/components/UploadMemeForm";
import { sendGTMEvent } from "@next/third-parties/google";

import { Button } from "@/components/ui/button";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const showModal = () => {
        setIsOpen(true);
        sendGTMEvent({ event: "meme-upload" });
    };
    return (
        <>
            <header className="font-bold text-lg text-center p-1 px-4 flex justify-between items-center relative sticky top-0 bg-[#060c18]/80 z-10 backdrop-blur-md border-b-2 shadow-border">
                <Link href="/" className="hidden md:block">
                    Qasr el Memez
                </Link>
                <Link href="/">
                    <Image
                        src="/logo.png"
                        alt="Qasr el Memez"
                        width={70}
                        height={70}
                    />
                </Link>
                <Button
                    className="bg-gray-200 text-gray-800 p-1 px-2 py-1 rounded-lg flex justify-center items-center gap-2"
                    onClick={showModal}
                >
                    Upload <Upload />
                </Button>
            </header>
            <Suspense>
                <UploadMemeForm open={isOpen} onOpen={setIsOpen} />
            </Suspense>
        </>
    );
}
