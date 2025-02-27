'use client'
import Image from "next/image";
import Link from "next/link";
import { Suspense } from 'react';
import UploadMemeForm from '@/components/UploadMemeForm';

function UploadFormSkeleton() {
    return <div className="w-32 h-10 bg-gray-700 animate-pulse rounded" />;
}

export default function Header() {
    return (
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
            <Suspense fallback={<UploadFormSkeleton />}>
                <UploadMemeForm className="" />
            </Suspense>
        </header>
    );
}
