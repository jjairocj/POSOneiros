import type { Metadata } from "next";

// page.tsx here is "use client" (useSession, signIn) and can't export
// metadata itself — this server layout carries the tab title instead.
export const metadata: Metadata = {
    title: "Iniciar sesión",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
