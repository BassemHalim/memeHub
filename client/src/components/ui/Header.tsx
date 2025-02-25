'use client'
import Image from "next/image";
import Link from "next/link";

import dynamic from 'next/dynamic'
 
const UploadMemeForm = dynamic(
  () => import('@/components/UploadMemeForm'),
  { ssr: false }
)
export default function Header() {
    return (
        <header className="font-bold text-lg text-center p-1 px-4 flex justify-between items-center  relative sticky top-0 bg-[#060c18]/80 z-10  backdrop-blur-md border-b-2  shadow-border ">
            <Link href="/" className="hidden md:block">
                Qasr el memez
            </Link>
            <Link href="/">
                <Image
                    src="/logo.png"
                    alt="qasr el memes"
                    width={70}
                    height={70}
                />
            </Link>
            <UploadMemeForm className=" " />
        </header>
    );
}
