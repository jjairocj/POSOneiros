"use client";

import { usePathname } from "next/navigation";
import styles from "./shell.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  // POS has its own isolated layout (dark mode, no sidebar/bottom nav) and
  // /admin builds its own complete nav (AdminSidebar + AdminMobileNav) —
  // this shell has nothing left to render for either.
  const isPosPage = pathname.startsWith("/pos");
  const isAdminPage = pathname.startsWith("/admin");
  const hideShell = isLoginPage || isPosPage || isAdminPage;

  return (
    <div className={styles.shell}>
      <main className={`${styles.main} ${hideShell ? styles.loginMode : ""}`}>
        {children}
      </main>
    </div>
  );
}
