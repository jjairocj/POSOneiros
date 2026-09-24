// POS offline shell — scope /pos only (see registration in app/pos/components/ServiceWorkerRegister.tsx).
//
// Strategy: runtime caching, not a build-time precache list. Turbopack hashes
// every chunk filename, so there is no fixed asset manifest to precache at
// write-time — instead, every GET the cashier's browser makes while online
// gets cached as it happens, and served back from cache the moment a fetch
// fails. By the time a connection drops, /pos has normally already been
// loaded at least once this session, so its shell (HTML/JS/CSS) is already
// warm in the cache.
//
// Deliberately does NOT touch POST requests: Server Actions (processSale,
// getProducts, etc.) are POST and must pass straight through to the network
// so app/lib/offlineSalesQueue.ts's own catch-and-queue logic keeps working
// exactly as it does today. This service worker only makes the app shell
// itself able to open with no network — it is not the sync mechanism.

const CACHE_VERSION = "oneiros-pos-shell-v3";
const SCOPE_PREFIX = "/pos";

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
        ).then(() => self.clients.claim())
    );
});

function isInScope(url) {
    return url.origin === self.location.origin && (
        url.pathname.startsWith(SCOPE_PREFIX) ||
        url.pathname.startsWith("/_next/") ||
        url.pathname === "/manifest.webmanifest"
    );
}

// Next.js's client router re-fetches route paths like "/pos" as RSC payloads
// (marked with an "RSC" or "Next-Router-State-Tree" request header) to
// refresh data client-side, completely separate from the actual document
// navigation. Both share the same URL, and Cache Storage keys purely by URL —
// caching both under that one key means whichever fetch happens last (almost
// always an RSC data fetch, not the real page load) overwrites and corrupts
// the cached HTML document. A real offline navigation would then get served
// a raw RSC payload instead of a page. So: only ever cache.put the response
// for an actual navigation request, and always ignore Vary when reading it
// back — we deliberately keep exactly one variant per URL, the last real page load.
function isRscDataRequest(request) {
    return request.headers.has("RSC") || request.headers.has("Next-Router-State-Tree") || request.headers.has("Next-Router-Prefetch");
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return; // never intercept Server Actions (POST)

    const url = new URL(request.url);
    if (!isInScope(url)) return;

    const cacheable = !isRscDataRequest(request);

    event.respondWith(
        (async () => {
            try {
                const fresh = await fetch(request);
                if (fresh && fresh.ok && cacheable) {
                    const cache = await caches.open(CACHE_VERSION);
                    cache.put(request, fresh.clone());
                }
                return fresh;
            } catch {
                const cache = await caches.open(CACHE_VERSION);
                const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate", ignoreVary: true });
                if (cached) return cached;
                if (request.mode === "navigate") {
                    const posShell = await cache.match("/pos", { ignoreVary: true });
                    if (posShell) return posShell;
                }
                throw new Error("offline and not cached");
            }
        })()
    );
});
