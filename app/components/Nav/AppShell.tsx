"use client";

import Navbar from "./Navbar";
import { usePathname } from "next/navigation";
import styles from "./shell.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  // POS gets its own isolated layout (dark mode, no sidebar, no bottom nav)
  const isPosPage = pathname.startsWith("/pos");
  const hideShell = isLoginPage || isPosPage;

  return (
    <div className={styles.shell}>
      {!hideShell && <Navbar />}
      <main className={`${styles.main} ${hideShell ? styles.loginMode : ""}`}>
        {children}
      </main>
    </div>
  );
}
