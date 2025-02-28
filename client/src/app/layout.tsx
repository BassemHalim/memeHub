import Footer from "@/components/ui/Footer";
import Header from "@/components/ui/Header";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";
import "./globals.css";



export const metadata: Metadata = {
    title: "Qasr El Memez",
    description: "The home of your egyptian memes",
    openGraph: {
        type: "website",
        url: "https://qasrelmemez.com",
        title: "Qasr El Memez",
        description: "Qasr el Memez | Your daily dose of authentic Egyptian humor, viral content, and relatable local memes. Share, laugh, and connect with the best of Egyptian internet culture.",
        images: [
            {
                url: "https://qasrelmemez.com/logo.png",
                width: 588,
                height: 588,
                alt: "Qasr El Memez",
            },
        ],
    },
        
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={` antialiased flex flex-col min-h-screen`}>
                <Header />
                <main className="grow flex flex-col items-center justify-center w-full">
                    {children}
                </main>
                <Footer />
            </body>
            <GoogleAnalytics
                gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_TAG!}
            />
        </html>
    );
}
