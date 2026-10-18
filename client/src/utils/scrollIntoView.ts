import { FocusEvent } from "react";

/**
 * Scrolls the focused input to just below the sticky header on mobile devices,
 * after the virtual keyboard has resized the viewport. No-op on desktop.
 */
export function scrollInputIntoView(e: FocusEvent<HTMLInputElement>) {
    if (!navigator.maxTouchPoints) return;
    const el = e.currentTarget;
    setTimeout(() => {
        const header = document.querySelector("header");
        const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
        const inputTop = el.getBoundingClientRect().top;
        const gap = 16; // px gap between header and input
        const delta = inputTop - headerBottom - gap;
        window.scrollBy({ top: delta, behavior: "smooth" });
    }, 300);
}
