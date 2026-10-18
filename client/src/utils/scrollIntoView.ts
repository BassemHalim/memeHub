import { FocusEvent } from "react";

/**
 * Scrolls the focused input into view on mobile devices after the virtual
 * keyboard has resized the viewport. No-op on desktop (no touch points).
 */
export function scrollInputIntoView(e: FocusEvent<HTMLInputElement>) {
    if (!navigator.maxTouchPoints) return;
    const el = e.currentTarget;
    setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
}
