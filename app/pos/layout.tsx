export default function POSLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Ocultar sidebar/bottomnav del AppShell global en rutas POS */
        nav[class*="navbar-module"] {
          display: none !important;
        }
        /* Remover el padding-left (260px) y padding-bottom (64px) del shell */
        main[class*="shell-module"] {
          padding-left: 0 !important;
          padding-bottom: 0 !important;
        }
      `}</style>
      {children}
    </>
  );
}
