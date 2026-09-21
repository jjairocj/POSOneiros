"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { SessionGuard } from "./components/SessionGuard";
import { TutorialModeProvider } from "./components/TutorialMode";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey="oneiros-theme">
      <SessionProvider refetchInterval={5 * 60}><SessionGuard /><TutorialModeProvider>{children}</TutorialModeProvider></SessionProvider>
    </ThemeProvider>
  );
}
