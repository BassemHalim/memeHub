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
        <header className="font-bold text-lg text-center p-2 flex justify-between items-center  relative">
            <Link href="/" className="hidden md:block">
                Qasr el memez
            </Link>
            <Link href="/">
                <Image
                    src="/logo.png"
                    alt="qasr el memes"
                    width={80}
                    height={80}
                />
            </Link>
            <UploadMemeForm className=" " />
        </header>
    );
}
