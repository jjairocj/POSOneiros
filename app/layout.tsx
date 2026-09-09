import "./globals.css";
import { Providers } from "./providers";
import AppShell from "./components/Nav/AppShell";
import { Toaster } from "sonner";
import { getSettings } from "./actions/settings";
import { BusinessInfoProvider } from "./components/BusinessInfoProvider";

// Business settings are read from the DB on every request; never bake them into a static build.
export const dynamic = "force-dynamic";

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
