"use client";
import { Link } from "@/i18n/navigation";
import { sendEvent } from "@/utils/googleAnalytics";
import { Home, Search, SquarePlus, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import CreateMeme from "../CreateMemeForm";

export default function NavigationDrawer() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const showModal = () => {
        setIsOpen(true);
        sendEvent("open_upload_form");
    };
    const isSearchPage = pathname.startsWith("/search");
    const isGeneratorPage = pathname.startsWith("/generator");
    console.log(pathname);
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50  bg-[#060c18] min-h-[10vh] rounded-t-2xl flex justify-center items-center border-t-2 border-slate-500 shadow-border md:hidden">
            <div className="flex p-2 justify-around flex-row-reverse w-full">
                {(isSearchPage || isGeneratorPage) && (
                    <Link
                        href={"/"}
                        className="text-primary rounded-full flex flex-col justify-center items-center gap-2"
                    >
                        <Home />
                        <p className="">Home</p>
                    </Link>
                )}
                {!isSearchPage && (
                    <Link
                        href={"/search"}
                        className="text-primary rounded-full flex flex-col justify-center items-center gap-2"
                    >
                        <Search />
                        <p className="">Search</p>
                    </Link>
                )}
                {!isGeneratorPage && (
                    <Link
                        href={"/generator"}
                        className="text-primary rounded-full flex flex-col justify-center items-center gap-2"
                    >
                        <SquarePlus />
                        <p className="">Create</p>
                    </Link>
                )}
                <div className="text-primary rounded-full flex flex-col justify-center items-center gap-2" onClick={showModal}>
                    <Upload />
                    <p>Upload</p>
                </div>
            </div>
            <Suspense>
                <CreateMeme open={isOpen} onOpen={setIsOpen} />
            </Suspense>
        </div>
    );
}
