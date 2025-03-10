import Footer from "@/components/ui/Footer";
import Header from "@/components/ui/Header";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { El_Messiri } from "next/font/google";

import "./globals.css";
import { cn } from "@/components/lib/utils";

export const metadata: Metadata = {
    title: "Qasr El Memez",
    description: "The home of your egyptian memes",
    openGraph: {
        type: "website",
        url: "https://qasrelmemez.com",
        title: "Qasr El Memez",
        description:
            "Qasr el Memez | Your daily dose of authentic Egyptian humor, viral content, and relatable local memes. Share, laugh, and connect with the best of Egyptian internet culture.",
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
export const viewport: Viewport = {
    interactiveWidget: "resizes-content",
};

const font = El_Messiri({ weight: "500", subsets: ["arabic", "latin"] });
export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();
    return (
        <html lang={locale} dir={locale == "ar" ? "rtl" : "ltr"}>
            <body
                className={cn(
                    "antialiased flex flex-col min-h-screen",
                    font.className
                )}
            >
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <Header />
                    <main className="grow flex flex-col items-center justify-center w-full">
                        {children}
                    </main>
                    <Footer />
                </NextIntlClientProvider>
            </body>
            <GoogleAnalytics
                gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_TAG!}
            />
        </html>
    );
}
