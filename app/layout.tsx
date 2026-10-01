import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import AppShell from "./components/Nav/AppShell";
import { Toaster } from "sonner";
import { getSettings } from "./actions/settings";
import { BusinessInfoProvider } from "./components/BusinessInfoProvider";

// Business settings are read from the DB on every request; never bake them into a static build.
export const dynamic = "force-dynamic";

// Internal tool on a deliberately unlisted subdomain — never index it.
// Paired with app/robots.ts and the X-Robots-Tag header in next.config.ts.
// The rest of this metadata isn't for search engines (robots already says no)
// — it's so browser tabs, bookmarks and the "add to home screen" shortcut
// read like a real product instead of a bare "localhost:3100".
export const metadata: Metadata = {
  title: {
    default: "Oneiros POS",
    template: "%s | Oneiros POS",
  },
  description: "Punto de venta, inventario y reportes para un negocio pequeño.",
  applicationName: "Oneiros POS",
  robots: { index: false, follow: false, nocache: true },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0a",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <BusinessInfoProvider value={settings}>
            <AppShell>{children}</AppShell>
            <Toaster richColors position="top-right" />
          </BusinessInfoProvider>
        </Providers>
      </body>
    </html>
  );
}
