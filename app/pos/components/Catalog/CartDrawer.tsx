"use client";
import { useState } from "react";
import { useCartStore } from "@/app/store/useCartStore";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Minus, Plus, ShoppingCart } from "lucide-react";
import ShiftOpeningModal from "../Shift/ShiftOpeningModal";
import CheckoutModal from "../Checkout/CheckoutModal";

export default function CartDrawer({ activeShiftId }: { activeShiftId?: string }) {
    const { orders, activeOrderId, updateQuantity, clearActiveOrder } = useCartStore();
    const [isOpeningShift, setIsOpeningShift] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const activeOrder = orders[activeOrderId];

    if (!activeOrder) return null;

    const { items, subtotal, tax, total } = activeOrder;

    return (
        <div className="flex flex-col h-full bg-card border-l border-border shadow-2xl rounded-l-3xl overflow-hidden animate-in slide-in-from-right duration-500">
            {/* Header */}
            <div className="p-6 pb-4 flex justify-between items-center bg-card z-10 sticky top-0 border-b border-border/50">
                <h2 className="text-xl font-bold tracking-tight">
                    {activeOrder.name} <span className="text-muted-foreground text-base font-medium ml-1">({items.length})</span>
                </h2>
                {items.length > 0 && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearActiveOrder}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Limpiar
                    </Button>
                )}
            </div>

            {/* Item List (Scrollable) */}
            <ScrollArea className="flex-1 px-6">
                {items.length === 0 ? (
                    <div className="flex flex-col flex-1 items-center justify-center h-full text-muted-foreground py-20 opacity-60">
                        <ShoppingCart className="w-16 h-16 mb-4" strokeWidth={1.5} />
                        <p className="text-lg font-medium">Bandeja vacía</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 py-4">
                        {items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-background/50 p-3 rounded-2xl border border-border/50 hover:bg-accent/30 transition-colors">
                                <div className="flex flex-col flex-1 truncate pr-2">
                                    <span className="font-semibold text-sm truncate">{item.name}</span>
                                    <span className="text-muted-foreground text-xs font-medium mt-1">${item.price.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2 bg-background border rounded-full px-1 py-1 shadow-sm">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                    >
                                        <Minus className="w-3.5 h-3.5" />
                                    </Button>
                                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 rounded-full hover:bg-primary/10 hover:text-primary"
                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Footer / Summary */}
            <div className="p-6 bg-card border-t border-border shadow-[0_-10px_40px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.2)]">
                <div className="space-y-2 mb-4 text-sm font-medium text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-foreground">${subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>IVA (19%)</span>
                        <span className="text-foreground">${tax.toLocaleString()}</span>
                    </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="flex justify-between items-center mb-6">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-black text-primary">${total.toLocaleString()}</span>
                </div>
                
                <Button 
                    className="w-full py-6 text-lg font-bold rounded-2xl shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={items.length === 0}
                    size="lg"
                    onClick={() => {
                        if (!activeShiftId) {
                            setIsOpeningShift(true);
                        } else {
                            setIsCheckoutOpen(true);
                        }
                    }}
                >
                    PROCEDER AL PAGO
                </Button>
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
                    }}
                    onCancel={() => setIsCheckoutOpen(false)}
                />
            )}
        </div>
    );
}
