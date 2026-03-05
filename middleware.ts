import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        const token = req.nextauth.token;
        const isAuth = !!token;
        const isAuthPage = req.nextUrl.pathname.startsWith("/login");

        if (isAuthPage) {
            if (isAuth) {
                return NextResponse.redirect(new URL("/pos", req.url));
            }
            return null;
        }

        if (!isAuth) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        // RBAC: Protect /admin route
        if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "ADMIN") {
            return NextResponse.redirect(new URL("/pos", req.url));
        }

        return null;
    },
    {
        callbacks: {
            authorized: () => true, // We handle redirects in the middleware function above
        },
    }
);

export const config = {
    matcher: ["/pos/:path*", "/admin/:path*", "/login"],
};
