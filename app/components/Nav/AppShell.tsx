"use client";

import Navbar from "./Navbar";
import { usePathname } from "next/navigation";
import styles from "./shell.module.css";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <div className={styles.shell}>
      {!isLoginPage && <Navbar />}
      <main className={`${styles.main} ${isLoginPage ? styles.loginMode : ""}`}>
        {children}
      </main>
    </div>
  );
}
