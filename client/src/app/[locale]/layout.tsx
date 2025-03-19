import Footer from "@/components/ui/Footer";
import Header from "@/components/ui/Header";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { El_Messiri } from "next/font/google";

import { cn } from "@/components/lib/utils";
import "./globals.css";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale: locale, namespace: "Metadata" });

    return {
        title: t("title"),
        description: t("description"),
        openGraph: {
            type: "website",
            url: "https://qasrelmemez.com",
            title: t("title"),
            description: t("description"),
            images: [
                {
                    url: "https://qasrelmemez.com/logo.png",
                    width: 588,
                    height: 588,
                    alt: "Qasr El Memez",
                },
            ],
        },
        alternates: {
            canonical: `https://qasrelmemez.com/${locale}`,

            languages: {
                "en-US": "https://qasrelmemez.com/en",
                "ar-EG": "https://qasrelmemez.com/ar",
            },
        },
    };
}
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
