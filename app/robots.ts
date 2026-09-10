import type { MetadataRoute } from "next";

/** Internal POS on a deliberately unlisted subdomain — keep it out of every crawler. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: "*", disallow: "/" },
    };
}
