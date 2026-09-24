"use client";
import { useEffect } from "react";

/**
 * Registers the POS-scoped service worker (public/sw.js) so the /pos shell
 * (HTML/JS/CSS) can still open with no network — separate from and unrelated
 * to app/lib/offlineSalesQueue.ts, which handles queuing/retrying the actual
 * sale requests. This component only makes the page load at all offline.
 */
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        navigator.serviceWorker.register("/sw.js", { scope: "/pos" }).catch((error) => {
            console.error("No se pudo registrar el service worker del POS:", error);
        });
    }, []);

    return null;
}
