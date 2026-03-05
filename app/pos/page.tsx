import { getActiveShift } from "../actions/shift";
import ShiftHeader from "./components/Shift/ShiftHeader";
import ProductGrid from "./components/Catalog/ProductGrid";
import CartDrawer from "./components/Catalog/CartDrawer";

export default async function POSPage() {
  const activeShift = await getActiveShift();

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-background/70 backdrop-blur-xl border-b shadow-sm">
        <ShiftHeader activeShift={activeShift} />
      </header>

      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] h-full overflow-hidden">
          <section className="h-full overflow-hidden relative pt-6 pl-6">
            <ProductGrid />
          </section>
          
          <aside className="h-full hidden lg:block overflow-hidden relative">
            <CartDrawer activeShiftId={activeShift?.id} />
          </aside>
        </div>
      </main>
    </div>
  );
}
