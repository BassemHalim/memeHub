import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ["ar"],
    defaultLocale: "ar",
    localePrefix: "as-needed",
    localeDetection: false,
    localeCookie: false,
});
