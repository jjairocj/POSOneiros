import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getActiveShift } from "../actions/shift";
import ShiftHeader from "./components/Shift/ShiftHeader";
import ProductGrid from "./components/Catalog/ProductGrid";
import CartDrawer from "./components/Catalog/CartDrawer";
import MobileCartBar from "./components/MobileCartBar";

export default async function POSPage() {
  const [session, activeShift] = await Promise.all([
    getServerSession(authOptions),
    getActiveShift(),
  ]);

  const userName = session?.user?.name ?? "Usuario";
  const userRole = (session?.user as any)?.role ?? "CASHIER";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex items-center px-4 sm:px-6 py-3 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <ShiftHeader
          activeShift={activeShift}
          userName={userName}
          userRole={userRole}
        />
      </header>

      {/* Main grid — catalog + desktop cart */}
      <main className="flex-1 overflow-hidden">
        {/* Extra bottom padding on mobile so content isn't hidden behind the cart bar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-full overflow-hidden">
          <section className="h-full overflow-y-auto pb-28 lg:pb-0 pt-4 px-4 sm:px-6">
            <ProductGrid />
          </section>

          {/* Desktop-only cart panel */}
          <aside className="h-full hidden lg:flex overflow-hidden">
            <CartDrawer activeShiftId={activeShift?.id} />
          </aside>
        </div>
      </main>

      {/* Mobile-only floating cart bar + bottom sheet */}
      <MobileCartBar activeShiftId={activeShift?.id} />
    </div>
  );
}
