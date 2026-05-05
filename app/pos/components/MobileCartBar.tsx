"use client";

import { useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { useCartStore } from "@/app/store/useCartStore";
import CartDrawer from "./Catalog/CartDrawer";

interface MobileCartBarProps {
  activeShiftId?: string;
}

export default function MobileCartBar({ activeShiftId }: MobileCartBarProps) {
  const [open, setOpen] = useState(false);
  const { orders, activeOrderId } = useCartStore();
  const activeOrder = orders[activeOrderId];
  const itemCount = activeOrder?.items.reduce((s, i) => s + i.quantity, 0) ?? 0;
  const total = activeOrder?.total ?? 0;

  return (
    <>
      {/* Fixed bottom bar — only on mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background/95 to-transparent">
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between bg-primary text-primary-foreground px-5 py-4 rounded-2xl shadow-2xl shadow-primary/30 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-destructive text-white rounded-full text-[10px] font-black flex items-center justify-center">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </div>
            <span className="font-bold text-sm">
              {itemCount === 0 ? "Ver carrito" : `${itemCount} ${itemCount === 1 ? "ítem" : "ítems"}`}
            </span>
          </div>
          <span className="font-black text-lg">${total.toLocaleString()}</span>
        </button>
      </div>

      {/* Bottom sheet */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative flex flex-col bg-card rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: "88vh" }}
          >
            {/* Handle + close */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <div className="w-10 h-1 bg-border rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-3" />
              <span className="text-lg font-bold text-foreground">Tu pedido</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reuse CartDrawer — it manages checkout internally */}
            <div className="flex-1 overflow-hidden">
              <CartDrawer
                activeShiftId={activeShiftId}
                onCheckoutSuccess={() => setOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
