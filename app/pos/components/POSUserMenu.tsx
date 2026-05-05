"use client";

import { signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { LogOut, LayoutDashboard, BarChart2, ChevronDown, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

interface POSUserMenuProps {
  userName: string;
  userRole: string;
}

export default function POSUserMenu({ userName, userRole }: POSUserMenuProps) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = theme === "dark";
  const isAdmin = userRole === "ADMIN";
  const initial = userName?.charAt(0).toUpperCase() ?? "U";

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // Anchor dropdown to bottom-right of button, clamped to viewport
      const dropdownWidth = 224; // w-56
      const rightEdge = window.innerWidth - rect.right;
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 8,
        right: Math.max(rightEdge, 8),
        width: dropdownWidth,
        zIndex: 9999,
      });
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-muted/60 hover:bg-muted border border-border/60 transition-all"
      >
        <span className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-xs font-black">
          {initial}
        </span>
        <span className="hidden sm:block text-sm font-semibold text-foreground max-w-[100px] truncate">
          {userName?.split(" ")[0]}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />

          <div style={dropdownStyle} className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-xs text-muted-foreground font-medium">Conectado como</p>
              <p className="text-sm font-bold text-foreground truncate">{userName}</p>
              <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                {userRole}
              </span>
            </div>

            {/* Theme toggle */}
            <div className="px-3 py-2 border-b border-border/50">
              <button
                onClick={() => setTheme(dark ? "light" : "dark")}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <span className="text-sm font-medium text-foreground">
                  {mounted ? (dark ? "Modo oscuro" : "Modo claro") : "Tema"}
                </span>
                {mounted && (
                  <span className="w-8 h-5 rounded-full relative flex-shrink-0 transition-colors" style={{ background: dark ? "hsl(var(--primary))" : "#e2e8f0" }}>
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all flex items-center justify-center"
                      style={{ left: dark ? "14px" : "2px" }}
                    >
                      {dark
                        ? <Moon className="w-2.5 h-2.5 text-primary" />
                        : <Sun className="w-2.5 h-2.5 text-amber-500" />
                      }
                    </span>
                  </span>
                )}
              </button>
            </div>

            {/* Navigation links */}
            <div className="py-1.5">
              {isAdmin && (
                <>
                  <a
                    href="/admin"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  >
                    <LayoutDashboard className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    Panel Admin
                  </a>
                  <a
                    href="/admin/sales"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors whitespace-nowrap"
                  >
                    <BarChart2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    Reportes y Ventas
                  </a>
                  <div className="h-px bg-border/50 my-1 mx-3" />
                </>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors whitespace-nowrap"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
