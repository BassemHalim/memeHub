"use server";
import { routing } from "@/i18n/config";
import { Locale } from "next-intl";
import { cookies } from "next/headers";

// In this example the locale is read from a cookie. You could alternatively
// also read it from a database, backend service, or any other source.
const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale() {
    return (await cookies()).get(COOKIE_NAME)?.value || routing.defaultLocale;
}

export async function setUserLocale(locale: Locale) {
    (await cookies()).set(COOKIE_NAME, locale);
}
