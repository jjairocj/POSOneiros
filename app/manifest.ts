import type { MetadataRoute } from "next";

/**
 * Enables "add to home screen" for the POS on the cashier's device. This app
 * is internal-only (see app/robots.ts) — the manifest doesn't make it public,
 * it only lets an already-authorized device install a shortcut that opens
 * straight into /pos. No icons yet — add real ones (192x192 and 512x512 PNGs
 * under public/) before relying on this for a polished install prompt.
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
    };
}
