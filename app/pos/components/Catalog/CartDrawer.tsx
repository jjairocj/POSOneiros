"use client";
import { useState } from "react";
import { useCartStore } from "@/app/store/useCartStore";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Minus, Plus, ShoppingCart, ArrowLeft } from "lucide-react";
import ShiftOpeningModal from "../Shift/ShiftOpeningModal";
import CheckoutModal from "../Checkout/CheckoutModal";

interface CartDrawerProps {
  activeShiftId?: string;
  /** Called after a successful checkout — used by MobileCartBar to close the sheet */
  onCheckoutSuccess?: () => void;
}

export default function CartDrawer({ activeShiftId, onCheckoutSuccess }: CartDrawerProps) {
    const { orders, activeOrderId, updateQuantity, clearActiveOrder } = useCartStore();
    const [isOpeningShift, setIsOpeningShift] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const activeOrder = orders[activeOrderId];

    if (!activeOrder) return null;

    const { items, subtotal, tax, total } = activeOrder;
    const hasItems = items.length > 0;

    return (
        <div className="flex flex-col h-full bg-card border-l border-border shadow-2xl rounded-l-3xl overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-5 pb-4 flex justify-between items-center border-b border-border/50">
                <h2 className="text-xl font-bold tracking-tight text-card-foreground">
                    {activeOrder.name}
                    <span className="text-muted-foreground text-base font-medium ml-2">({items.length})</span>
                </h2>
                {hasItems && (
                    <button
                        onClick={clearActiveOrder}
                        className="flex items-center gap-1.5 text-xs font-semibold text-destructive hover:text-destructive/80 px-2 py-1 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Limpiar
                    </button>
                )}
            </div>

            {/* Item list */}
            <ScrollArea className="flex-1 px-4">
                {!hasItems ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20 gap-4">
                        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center">
                            <ShoppingCart className="w-10 h-10 opacity-30" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                            <p className="text-base font-semibold text-foreground/60">Bandeja vacía</p>
                            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 justify-center">
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Selecciona productos del catálogo
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 py-4">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="flex justify-between items-center bg-muted/30 px-4 py-3 rounded-2xl border border-border/40"
                            >
                                <div className="flex flex-col flex-1 truncate pr-3">
                                    <span className="font-semibold text-sm truncate text-foreground">{item.name}</span>
                                    <span className="text-muted-foreground text-xs font-medium mt-0.5">
                                        ${item.price.toLocaleString()}
                                    </span>
                                </div>

                                {/* Quantity stepper — visible in dark mode */}
                                <div className="flex items-center gap-0 bg-background border border-border rounded-xl overflow-hidden">
                                    <button
                                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors font-bold text-lg"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="w-8 text-center font-black text-sm text-foreground">
                                        {item.quantity}
                                    </span>
                                    <button
                                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-border bg-card">
                <div className="space-y-2 mb-4 text-sm font-medium text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-foreground font-semibold">${subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>IVA (19%)</span>
                        <span className="text-foreground font-semibold">${tax.toLocaleString()}</span>
                    </div>
                </div>

                <Separator className="mb-4 opacity-50" />

                <div className="flex justify-between items-center mb-5">
                    <span className="text-lg font-bold text-foreground">Total</span>
                    <span className={`text-2xl font-black transition-colors ${hasItems ? "text-primary" : "text-muted-foreground"}`}>
                        ${total.toLocaleString()}
                    </span>
                </div>

                <button
                    disabled={!hasItems}
                    onClick={() => {
                        if (!activeShiftId) {
                            setIsOpeningShift(true);
                        } else {
                            setIsCheckoutOpen(true);
                        }
                    }}
                    className={[
                        "w-full py-4 text-lg font-bold rounded-2xl transition-all duration-200",
                        hasItems
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]"
                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
                    ].join(" ")}
                >
                    PROCEDER AL PAGO
                </button>
            </div>

            {isOpeningShift && <ShiftOpeningModal onClose={() => setIsOpeningShift(false)} />}
            {isCheckoutOpen && activeShiftId && (
                <CheckoutModal
                    activeShiftId={activeShiftId}
                    orderTotal={total}
                    items={items}
                    onSuccess={() => {
                        setIsCheckoutOpen(false);
                        clearActiveOrder();
                        onCheckoutSuccess?.();
                    }}
                    onCancel={() => setIsCheckoutOpen(false)}
                />
            )}
        </div>
    );
}
