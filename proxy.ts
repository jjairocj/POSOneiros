import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * Cheap, early gate for /pos and /admin: no token at all → straight to
 * /login, no page render needed. This is intentionally the ONLY thing this
 * proxy does with the token's *validity* beyond presence — the JWT it reads
 * (req.nextauth.token) is a raw decode of the cookie and never re-runs the
 * `jwt` callback (see the auth route's passwordChangedAt check), so it can
 * go stale for up to the SessionProvider's refetch interval. That staleness
 * is fine for "is someone logged in at all" but NOT for "is this specific
 * session still valid" — that authoritative check lives in
 * admin/layout.tsx and pos/page.tsx via a fresh getServerSession() call.
 *
 * Deliberately not gating /login here: bouncing an apparently-authenticated
 * visitor away from /login based on that same stale decode, combined with
 * the fresh page-level redirect *back* to /login for a truly invalidated
 * session, produces an infinite redirect loop (ERR_TOO_MANY_REDIRECTS) for
 * the whole staleness window. The "already logged in, skip the form"
 * convenience redirect is handled client-side in login/page.tsx instead,
 * using a live useSession() call that isn't subject to this staleness.
 */
export default withAuth(
    function proxy(req) {
        const token = req.nextauth.token;
        const isAuth = !!token && !token.invalid;

        if (!isAuth) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        // RBAC: /admin is for ADMIN and SUPERVISOR; CASHIER stays in /pos.
        // Same staleness caveat as above; the authoritative check is
        // admin/layout.tsx's fresh session read (and each ADMIN-only
        // sub-page, e.g. users/settings/import, does its own further check).
        if (req.nextUrl.pathname.startsWith("/admin") && token?.role === "CASHIER") {
            return NextResponse.redirect(new URL("/pos", req.url));
        }

        return null;
    },
    {
        callbacks: {
            authorized: () => true, // We handle redirects in the proxy function above
        },
    }
);

export const config = {
    matcher: ["/pos/:path*", "/admin/:path*"],
};
