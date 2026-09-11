import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import { getActiveShift } from "../actions/shift";
import ShiftHeader from "./components/Shift/ShiftHeader";
import ProductGrid from "./components/Catalog/ProductGrid";
import CartDrawer from "./components/Catalog/CartDrawer";
import MobileCartBar from "./components/MobileCartBar";

export default async function POSPage() {
  // Same reasoning as admin/layout.tsx: getServerSession() re-runs the jwt
  // callback (and its passwordChangedAt check) on every request, unlike the
  // proxy's raw JWT decode, so this redirect can't go stale.
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const activeShift = await getActiveShift();

  const userName = session.user.name ?? "Usuario";
  const userRole = session.user.role;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Sticky header — glass chrome: legible over whatever scrolls behind it (product photos),
          never used over a critical number (those live on solid surfaces, see CartDrawer footer).
          .glass-chrome (app/globals.css) drops the blur when the OS asks to reduce transparency. */}
      <header className="glass-chrome sticky top-0 z-20 flex items-center px-4 sm:px-6 py-3 border-b border-border/30 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)]">
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
          <section className="h-full overflow-hidden pt-4 px-4 sm:px-6">
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
