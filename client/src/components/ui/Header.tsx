"use client";
import { Link } from "@/i18n/navigation";
import { Mail, SquarePlus, Upload, X } from "lucide-react";
import Image from "next/image";
import { Suspense, useState } from "react";

import CreateMeme from "@/components/CreateMemeForm";
import { Button } from "@/components/ui/button";
import { sendEvent } from "@/utils/googleAnalytics";
import { useTranslations } from "next-intl";

const FEEDBACK_FORM_URL = process.env.NEXT_PUBLIC_FEEDBACK_FORM_URL ?? "";

function FeedbackModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="relative bg-[#060c18] border border-white/10 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-end px-4 py-3 border-b border-white/10">
                    <button
                        onClick={onClose}
                        aria-label="Close feedback"
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                <iframe
                    src={FEEDBACK_FORM_URL}
                    width="100%"
                    height="520"
                    title="Feedback form"
                    className="border-0"
                >
                    Loading…
                </iframe>
            </div>
        </div>
    );
}

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const showModal = () => {
        setIsOpen(true);
        sendEvent("open_upload_form");
    };
    const showFeedback = () => {
        setIsFeedbackOpen(true);
        sendEvent("open_feedback_form");
    };

    const t = useTranslations("Home");
    return (
        <>
            <header className="font-bold text-lg text-center p-1 px-4 flex flex-row justify-between items-center sticky top-0 bg-[#060c18]/80 z-40 backdrop-blur-md border-b-2 shadow-border" dir="ltr">
                {/* Mobile: envelope icon on the left */}
                {/* Wide: action buttons on the left */}
                <div className="flex justify-start items-center flex-1 gap-4">
                    {/* Mobile only: envelope */}
                    {FEEDBACK_FORM_URL && (
                        <button
                            onClick={showFeedback}
                            aria-label="Feedback"
                            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <Mail size={24} />
                        </button>
                    )}
                    {/* Wide only: Create + Upload buttons */}
                    <Button
                        asChild
                        className="hidden md:flex bg-primary text-secondary rounded-lg items-center gap-1"
                    >
                        <Link href={"/generator"}>
                            <p>{t("create")}</p>
                            <SquarePlus size={24} />
                        </Link>
                    </Button>
                    <Button
                        className="hidden md:flex bg-primary text-secondary rounded-lg items-center gap-1"
                        onClick={showModal}
                    >
                        <p>{t("upload")}</p>
                        <Upload />
                    </Button>
                </div>

                {/* Center: logo + title (wide: logo + title stacked | mobile: logo only) */}
                <Link href="/" className="flex flex-col justify-center items-center">
                    <Image
                        src="/logo.png"
                        alt="Qasr el Memez"
                        width={70}
                        height={70}
                    />
                    <span className="hidden md:block text-sm mt-0.5">{t("title")}</span>
                </Link>

                {/* Mobile: title on the right | Wide: envelope on the right */}
                <div className="flex justify-end items-center flex-1">
                    {/* Mobile only: title */}
                    <Link href="/" className="md:hidden text-sm">{t("title")}</Link>
                    {/* Wide only: envelope */}
                    {FEEDBACK_FORM_URL && (
                        <button
                            onClick={showFeedback}
                            aria-label="Feedback"
                            className="hidden md:block p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <Mail size={24} />
                        </button>
                    )}
                </div>
            </header>
            {process.env.NODE_ENV === "development" && (
                <div className="text-center p-4 bg-red-500">
                    API: {process.env.NEXT_PUBLIC_API_HOST}
                </div>
            )}
            <FeedbackModal open={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
            <Suspense>
                <CreateMeme open={isOpen} onOpen={setIsOpen} />
            </Suspense>
        </>
    );
}
