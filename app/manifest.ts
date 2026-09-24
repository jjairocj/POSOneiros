import type { MetadataRoute } from "next";

/**
 * Enables "add to home screen" for the POS on the cashier's device. This app
 * is internal-only (see app/robots.ts) — the manifest doesn't make it public,
 * it only lets an already-authorized device install a shortcut that opens
 * straight into /pos. Single SVG icon (public/icon.svg, same "OP" mark as
 * AdminSidebar) at every declared size — fine for the Chrome/Edge-only,
 * single-register deployment this runs on; swap in real PNGs first if this
 * ever needs to support Safari/iOS or a proper app-store-style install.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Oneiros POS",
        short_name: "Oneiros POS",
        description: "Punto de venta Oneiros",
        start_url: "/pos",
        scope: "/pos",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        icons: [
            { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml" },
            { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml" },
            { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
        ],
    };
}
