"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navbar.module.css";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Don't show Nav on login page
  if (pathname === "/login") return null;

  const navItems = [
    { name: "Venta", href: "/pos", icon: "🛒" },
    { name: "Inventario", href: "/admin/products", icon: "📦" },
    { name: "Ventas", href: "/admin/sales", icon: "📊" },
    { name: "Cajeros", href: "/admin/users", icon: "👥" },
    { name: "Ajustes", href: "/admin/config", icon: "⚙️" },
  ];

  return (
    <>
      {/* Dynamic Navigation: Sidebar for Desktop, Bottom Bar for Mobile */}
      <nav className={styles.nav}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>O</span>
          <span className={styles.logoText}>Oneiros</span>
        </div>
        
        <div className={styles.items}>
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.active : ""}`}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.name}>{item.name}</span>
            </Link>
          ))}
        </div>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={() => window.location.href = '/api/auth/signout'}>
             📤 Salir
          </button>
        </div>
      </nav>
    </>
  );
}
