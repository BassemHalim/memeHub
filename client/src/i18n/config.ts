import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ["en", "ar"],
    defaultLocale: "ar",
    localePrefix: "as-needed",
    localeDetection: false,
});
