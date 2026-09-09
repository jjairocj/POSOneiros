"use client";
import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

/** Signs the browser out when the server marked the session invalid (e.g. password changed elsewhere). */
export function SessionGuard() {
    const { data, status } = useSession();
    useEffect(() => {
        if (status === "authenticated" && !data?.user) {
            signOut({ callbackUrl: "/login" });
        }
    }, [status, data]);
    return null;
}
