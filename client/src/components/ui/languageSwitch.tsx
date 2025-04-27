"use client";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Languages } from "lucide-react";
import { Locale, useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useTransition } from "react";
import { Button } from "./button";

const COOKIE_NAME = "USER_LOCALE";

const setLocaleCookie = (value: Locale, days = 365) => {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${COOKIE_NAME}=${value};${expires};path=/;`;
};
// Helper function to get cookies with vanilla JS
const getLocaleFromCookie = () => {
    const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    return cookieValue ? cookieValue.split("=")[1] : null;
};

export default function LanguageSwitch() {
    const isArabic = useLocale() == "ar";
    const router = useRouter();
    const [, startTransition] = useTransition();
    const pathname = usePathname();
    const params = useParams();
    const searchParams = useSearchParams();

    const setUserLocale = useCallback(
        function (nextLocale: Locale) {
            setLocaleCookie(nextLocale);
            startTransition(() => {
                // Create a new URLSearchParams instance to properly handle query parameters
                const newSearchParams = new URLSearchParams(
                    searchParams.toString()
                );

                router.replace(
                    {
                        pathname,
                        // @ts-expect-error -- TypeScript will validate that only known `params` are used in combination with a given `pathname`. Since the two will always match for the current route, we can skip runtime checks.
                        params,
                        // Only include query if there are search parameters
                        ...(newSearchParams.toString()
                            ? { query: Object.fromEntries(newSearchParams) }
                            : {}),
                    },
                    { locale: nextLocale }
                );
            });
        },
        [params, pathname, router, searchParams]
    );

    useEffect(() => {
        let localeCookie = getLocaleFromCookie();
        const locale = isArabic ? "ar" : "en";
        if (!localeCookie) {
            localeCookie = locale;
            setLocaleCookie(locale);
        }
        if (locale !== localeCookie) {
            setUserLocale(localeCookie as Locale);
        }
    }, [isArabic, setUserLocale]);

    return (
        <Button
            aria-label="language button"
            className="bg-primary text-secondary "
            onClick={() => {
                setUserLocale(isArabic ? "en" : "ar");
            }}
        >
            <Languages />
        </Button>
    );
}
