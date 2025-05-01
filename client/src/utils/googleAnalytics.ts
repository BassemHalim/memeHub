export function sendEvent(action: string, params?: unknown) {
    window?.gtag("event", action, params);
}
