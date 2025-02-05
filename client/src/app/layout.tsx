import type { Metadata } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "@ant-design/v5-patch-for-react-19";
import "./globals.css";
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
    title: "Qasr El Memez",
    description: "The home of your memes",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                // className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
                className={` antialiased flex flex-col min-h-screen`}
            >
                <Header />
                <main className="flex-grow flex flex-col items-center justify-center w-full">
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}
