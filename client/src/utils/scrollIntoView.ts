import { FocusEvent } from "react";

/**
 * Scrolls the focused input into view on mobile devices after the virtual
 * keyboard has resized the viewport. No-op on desktop.
 *
 * Relies on `[scroll-margin-bottom:calc(10vh+24px)]` being present as a
 * Tailwind class on the input, so the browser leaves enough clearance above
 * the fixed bottom navigation drawer when scrolling.
 */
export function scrollInputIntoView(e: FocusEvent<HTMLInputElement>) {
    if (!navigator.maxTouchPoints) return;
    const el = e.currentTarget;
    setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
}
