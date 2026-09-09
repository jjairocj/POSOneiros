"use client";
import { useState } from "react";
import { Minus, Plus, ShoppingCart, ArrowLeft, Trash2, Users, Tag, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCartStore, type CartItem } from "@/app/store/useCartStore";
import { formatMoney } from "@/app/lib/money";
import ShiftOpeningModal from "../Shift/ShiftOpeningModal";
import CheckoutModal from "../Checkout/CheckoutModal";
import SplitBillModal from "../Checkout/SplitBillModal";
import { useSubAccountStore } from "@/app/store/useSubAccountStore";

// ─── Sub-components ───────────────────────────────────────────────────────────

function CartItemRow({ item, onChangeQty, onDiscount }: { item: CartItem; onChangeQty: (q: number) => void; onDiscount: (amount: number) => void }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const lineBase = Math.round(item.price * item.quantity);
    const commit = () => {
        const v = Math.round(Number(draft));
        onDiscount(Number.isFinite(v) ? v : 0);
        setEditing(false);
    };
    return (
        <div className="flex justify-between items-center bg-muted/30 px-4 py-3 rounded-2xl border border-border/40">
            <div className="flex flex-col flex-1 min-w-0 pr-3">
                <span className="font-semibold text-sm truncate text-foreground">{item.name}</span>
                {editing ? (
                    <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">Desc. $</span>
                        <input
                            autoFocus
                            type="number"
                            min={0}
                            max={lineBase}
                            inputMode="numeric"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
                            className="w-24 text-xs bg-background border border-primary rounded-lg px-2 py-1 outline-none"
                            aria-label={`Descuento para ${item.name}`}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => { setDraft(String(item.discount ?? "")); setEditing(true); }}
                        className="text-left text-xs font-medium mt-0.5 flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
                        title="Aplicar descuento a esta línea"
                    >
                        {formatMoney(item.price)}
                        {item.discount ? (
                            <span className="text-emerald-500 font-semibold">−{formatMoney(item.discount)}</span>
                        ) : (
                            <Tag className="w-3 h-3 opacity-60" />
                        )}
                    </button>
                )}
            </div>
            <div className="flex items-center bg-background border border-border rounded-xl overflow-hidden">
                <button
                    type="button"
                    aria-label="Reducir cantidad"
                    className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={() => onChangeQty(item.quantity - 1)}
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-8 text-center font-black text-sm text-foreground">{item.quantity}</span>
                <button
                    type="button"
                    aria-label="Aumentar cantidad"
                    className="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    onClick={() => onChangeQty(item.quantity + 1)}
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

function TaxLineRow({ label, amount }: { label: string; amount: number }) {
    if (amount <= 0) return null;
    return (
        <div className="flex justify-between">
            <span>{label}</span>
            <span className="text-foreground font-semibold">{formatMoney(amount)}</span>
        </div>
    );
}

function EmptyCart() {
    return (
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
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CartDrawerProps {
    activeShiftId?: string;
    onCheckoutSuccess?: () => void;
}

export default function CartDrawer({ activeShiftId, onCheckoutSuccess }: CartDrawerProps) {
    const { orders, activeOrderId, updateQuantity, clearActiveOrder, setLineDiscount, setOrderDiscount } = useCartStore();
    const [discountOpen, setDiscountOpen] = useState(false);
    const [discountType, setDiscountType] = useState<"percent" | "amount">("percent");
    const [discountDraft, setDiscountDraft] = useState("");
    const { initSplit } = useSubAccountStore();
    const [isOpeningShift, setIsOpeningShift] = useState(false);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isSplitOpen, setIsSplitOpen] = useState(false);

    const activeOrder = orders[activeOrderId];
    if (!activeOrder) return null;

    const { items, subtotal, discount, taxIva, taxIca, taxImpoConsumo, total, orderDiscount } = activeOrder;
    const hasItems = items.length > 0;

    const applyOrderDiscount = () => {
        const v = Number(discountDraft);
        setOrderDiscount(Number.isFinite(v) && v > 0 ? { type: discountType, value: v } : null);
        setDiscountOpen(false);
        setDiscountDraft("");
    };

    const handleCheckout = () => {
        if (!activeShiftId) {
            setIsOpeningShift(true);
        } else {
            setIsCheckoutOpen(true);
        }
    };

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
                        type="button"
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
                {hasItems ? (
                    <div className="flex flex-col gap-3 py-4">
                        {items.map((item) => (
                            <CartItemRow
                                key={item.id}
                                item={item}
                                onChangeQty={(q) => updateQuantity(item.id, q)}
                                onDiscount={(amount) => setLineDiscount(item.id, amount)}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyCart />
                )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 border-t border-border bg-card">
                <div className="space-y-2 mb-4 text-sm font-medium text-muted-foreground">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="text-foreground font-semibold">{formatMoney(subtotal)}</span>
                    </div>
                    {/* Order discount */}
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                            Descuento
                            {hasItems && !discountOpen && (
                                <button
                                    type="button"
                                    onClick={() => setDiscountOpen(true)}
                                    className="text-[11px] font-semibold px-2 py-0.5 rounded-lg border border-border hover:border-primary hover:text-primary transition-colors"
                                >
                                    {orderDiscount ? (orderDiscount.type === "percent" ? `${orderDiscount.value}%` : "editar") : "aplicar"}
                                </button>
                            )}
                            {orderDiscount && !discountOpen && (
                                <button type="button" aria-label="Quitar descuento" onClick={() => setOrderDiscount(null)} className="text-muted-foreground hover:text-destructive">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </span>
                        <span className={`font-semibold ${discount > 0 ? "text-emerald-500" : "text-foreground"}`}>
                            {discount > 0 ? `−${formatMoney(discount)}` : formatMoney(0)}
                        </span>
                    </div>
                    {discountOpen && (
                        <div className="flex items-center gap-2 bg-muted/40 rounded-xl p-2 border border-border/50">
                            <div className="flex rounded-lg overflow-hidden border border-border text-xs font-bold">
                                <button type="button" onClick={() => setDiscountType("percent")} className={`px-2.5 py-1 ${discountType === "percent" ? "bg-primary text-primary-foreground" : "bg-background"}`}>%</button>
                                <button type="button" onClick={() => setDiscountType("amount")} className={`px-2.5 py-1 ${discountType === "amount" ? "bg-primary text-primary-foreground" : "bg-background"}`}>$</button>
                            </div>
                            <input
                                autoFocus
                                type="number"
                                min={0}
                                max={discountType === "percent" ? 100 : subtotal}
                                inputMode="numeric"
                                value={discountDraft}
                                onChange={(e) => setDiscountDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") applyOrderDiscount(); if (e.key === "Escape") setDiscountOpen(false); }}
                                placeholder={discountType === "percent" ? "10" : "5000"}
                                aria-label="Descuento de la orden"
                                className="flex-1 min-w-0 h-8 rounded-lg bg-background border border-border px-2 text-sm text-foreground outline-none focus:border-primary"
                            />
                            <button type="button" onClick={applyOrderDiscount} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground">OK</button>
                            <button type="button" onClick={() => setDiscountOpen(false)} className="text-xs px-2 py-1.5 text-muted-foreground">Cancelar</button>
                        </div>
                    )}
                    <TaxLineRow label="IVA" amount={taxIva} />
                    <TaxLineRow label="ICA" amount={taxIca} />
                    <TaxLineRow label="Impo. Consumo" amount={taxImpoConsumo} />
                </div>

                <Separator className="mb-4 opacity-50" />

                <div className="flex justify-between items-center mb-5">
                    <span className="text-lg font-bold text-foreground">Total</span>
                    <span className={`text-2xl font-black transition-colors ${hasItems ? "text-primary" : "text-muted-foreground"}`}>
                        {formatMoney(total)}
                    </span>
                </div>

                {hasItems && (
                    <button
                        type="button"
                        onClick={() => {
                        if (!activeShiftId) { setIsOpeningShift(true); return; }
                        initSplit(items);
                        setIsSplitOpen(true);
                    }}
                        className="w-full py-2.5 text-sm font-semibold rounded-2xl border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 mb-3"
                    >
                        <Users className="w-4 h-4" /> Dividir cuenta
                    </button>
                )}

                <button
                    type="button"
                    disabled={!hasItems}
                    onClick={handleCheckout}
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
            {isSplitOpen && activeShiftId && (
                <SplitBillModal
                    activeShiftId={activeShiftId}
                    items={items}
                    orderDiscount={orderDiscount}
                    onClose={() => setIsSplitOpen(false)}
                    onSuccess={() => {
                        setIsSplitOpen(false);
                        clearActiveOrder();
                        onCheckoutSuccess?.();
                    }}
                />
            )}
            {isCheckoutOpen && activeShiftId && (
                <CheckoutModal
                    activeShiftId={activeShiftId}
                    orderTotal={total}
                    items={items}
                    orderDiscount={orderDiscount}
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
