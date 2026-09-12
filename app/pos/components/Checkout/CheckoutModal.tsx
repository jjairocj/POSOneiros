"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Receipt as ReceiptIcon, X, Banknote, CreditCard, ArrowRightLeft,
    UserSearch, UserPlus, ChevronDown, ChevronUp, Search, User,
} from "lucide-react";
import { processSale, type PaymentInput } from "../../../actions/sale";
import { searchCustomers, createCustomer, type CustomerResult } from "../../../actions/customers";
import SaleSuccess from "./SaleSuccess";
import type { ReceiptSale } from "./Receipt";
import type { CartItem, OrderDiscount } from "@/app/types/cart";
import { playSaleSound } from "@/app/lib/sound";
import { formatMoney } from "@/app/lib/money";
import { useOfflineSalesQueue } from "@/app/lib/offlineSalesQueue";
import { CloudOff } from "lucide-react";

const QUICK_BILLS = [5000, 10000, 20000, 50000, 100000];

// ─── Customer picker ──────────────────────────────────────────────────────────

function CustomerPicker({ onSelect }: { onSelect: (c: CustomerResult | null) => void }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<CustomerResult[]>([]);
    const [selected, setSelected] = useState<CustomerResult | null>(null);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDoc, setNewDoc] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [searching, setSearching] = useState(false);
    const [createError, setCreateError] = useState("");
    const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleQuery = useCallback((q: string) => {
        setQuery(q);
        if (debounce.current) clearTimeout(debounce.current);
        if (q.length < 2) { setResults([]); return; }
        debounce.current = setTimeout(async () => {
            setSearching(true);
            const res = await searchCustomers(q);
            setResults(res);
            setSearching(false);
        }, 300);
    }, []);

    const pick = (c: CustomerResult) => {
        setSelected(c);
        onSelect(c);
        setOpen(false);
        setQuery("");
        setResults([]);
    };

    const clear = () => {
        setSelected(null);
        onSelect(null);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setSearching(true);
        setCreateError("");
        try {
            const res = await createCustomer({ fullName: newName, documentId: newDoc, phone: newPhone });
            if (!res.ok) { setCreateError(res.error); return; }
            pick(res.data);
            setCreating(false);
            setNewName(""); setNewDoc(""); setNewPhone("");
        } catch {
            setCreateError("No se pudo crear el cliente. Revisa la conexión.");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="bg-accent/20 rounded-2xl border border-border overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent/40 transition-colors"
            >
                <span className="flex items-center gap-2 text-muted-foreground">
                    <UserSearch className="w-4 h-4" />
                    {selected ? (
                        <span className="text-foreground">{selected.fullName}{selected.documentId ? ` · ${selected.documentId}` : ""}</span>
                    ) : (
                        "Asociar cliente (opcional)"
                    )}
                </span>
                <div className="flex items-center gap-2">
                    {selected && (
                        <span
                            onClick={(e) => { e.stopPropagation(); clear(); }}
                            className="text-xs text-destructive hover:underline px-1"
                        >Quitar</span>
                    )}
                    {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
            </button>

            {open && (
                <div className="border-t border-border p-3 space-y-3">
                    {!creating ? (
                        <>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    value={query}
                                    onChange={(e) => handleQuery(e.target.value)}
                                    placeholder="Nombre, documento o teléfono..."
                                    className="pl-9 h-10 rounded-xl bg-background text-sm"
                                />
                            </div>
                            {searching && <p className="text-xs text-muted-foreground text-center py-1">Buscando...</p>}
                            {results.length > 0 && (
                                <ul className="space-y-1 max-h-36 overflow-y-auto">
                                    {results.map(c => (
                                        <li key={c.id}>
                                            <button
                                                type="button"
                                                onClick={() => pick(c)}
                                                className="w-full text-left px-3 py-2 rounded-xl hover:bg-accent/60 transition-colors text-sm"
                                            >
                                                <span className="font-semibold text-foreground">{c.fullName}</span>
                                                {c.documentId && <span className="text-muted-foreground ml-2 text-xs">{c.documentId}</span>}
                                                {c.phone && <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {query.length >= 2 && !searching && results.length === 0 && (
                                <p className="text-xs text-muted-foreground text-center py-1">Sin resultados.</p>
                            )}
                            <button
                                type="button"
                                onClick={() => setCreating(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Crear nuevo cliente
                            </button>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs font-bold text-foreground">Nuevo cliente</p>
                            <Input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre completo *" className="h-9 rounded-xl text-sm" />
                            <div className="grid grid-cols-2 gap-2">
                                <Input value={newDoc} onChange={e => setNewDoc(e.target.value)} placeholder="Documento" className="h-9 rounded-xl text-sm" />
                                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Teléfono" className="h-9 rounded-xl text-sm" />
                            </div>
                            <div className="flex gap-2">
                                {createError && <p className="w-full text-xs text-destructive font-medium">{createError}</p>}
                                <Button type="button" size="sm" className="flex-1 rounded-xl h-9 text-xs" onClick={handleCreate} disabled={!newName.trim() || searching}>
                                    {searching ? "Guardando..." : "Guardar"}
                                </Button>
                                <Button type="button" variant="outline" size="sm" className="rounded-xl h-9 text-xs" onClick={() => setCreating(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function CheckoutModal({
    activeShiftId,
    orderTotal,
    items,
    onSuccess,
    onCancel,
    subAccountLabel,
    mode = "sale",
    onCollect,
    orderDiscount = null,
}: {
    activeShiftId: string;
    orderTotal: number;
    items: CartItem[];
    onSuccess: () => void;
    onCancel: () => void;
    subAccountLabel?: string;
    /**
     * "sale": registers the sale on the server (default).
     * "collect": only records how this person paid; the caller registers a
     * single sale later with all the collected payments (split bill).
     */
    mode?: "sale" | "collect";
    onCollect?: (payments: PaymentInput[], change: number) => void;
    orderDiscount?: OrderDiscount | null;
}) {
    const [loading, setLoading] = useState(false);
    const [cash, setCash] = useState("");
    const [card, setCard] = useState("");
    const [transfer, setTransfer] = useState("");
    const [error, setError] = useState("");
    const [completedSale, setCompletedSale] = useState<ReceiptSale | null>(null);
    const [collected, setCollected] = useState(false);
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [queuedOffline, setQueuedOffline] = useState(false);
    const enqueueOfflineSale = useOfflineSalesQueue((s) => s.enqueue);
    // Stable per checkout attempt: reused across the queue's automatic
    // retries so the server can recognize a retry instead of double-selling.
    const [clientRef] = useState(() => crypto.randomUUID());

    const toAmount = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) && n > 0 ? n : 0; };
    const cashAmount = toAmount(cash);
    const cardAmount = toAmount(card);
    const transferAmount = toAmount(transfer);
    const totalPaid = cashAmount + cardAmount + transferAmount;
    const remaining = Math.max(0, orderTotal - totalPaid);
    const change = Math.max(0, totalPaid - orderTotal);
    const canSubmit = totalPaid >= orderTotal - 0.5 && (mode === "collect" || items.length > 0);

    const buildPayments = (): PaymentInput[] => {
        // Card / transfer never give change; cash absorbs the remainder.
        let amountToCover = orderTotal;
        const payments: PaymentInput[] = [];
        if (cardAmount > 0) {
            const applied = Math.min(amountToCover, cardAmount);
            payments.push({ method: "CARD", amount: applied, subAccountLabel });
            amountToCover -= applied;
        }
        if (transferAmount > 0) {
            const applied = Math.min(amountToCover, transferAmount);
            payments.push({ method: "TRANSFER", amount: applied, subAccountLabel });
            amountToCover -= applied;
        }
        if (cashAmount > 0 && amountToCover > 0) {
            payments.push({ method: "CASH", amount: amountToCover, subAccountLabel });
        }
        return payments.filter((p) => p.amount > 0);
    };

    const handleCheckout = async () => {
        if (!canSubmit || loading) return;
        setError("");
        const payments = buildPayments();
        if (payments.length === 0) { setError("Ingresa cómo se paga."); return; }

        if (mode === "collect") {
            playSaleSound();
            setCollected(true);
            onCollect?.(payments, change);
            return;
        }

        setLoading(true);
        const saleItems = items.map((i) => ({ id: i.id, quantity: i.quantity, discount: i.discount ?? 0 }));
        const options = { customerId: customerId ?? undefined, subAccountLabel, discount: orderDiscount, clientRef };
        try {
            const res = await processSale(activeShiftId, saleItems, payments, options);
            if (!res.ok) { setError(res.error); return; }
            playSaleSound();
            setCompletedSale(res.data as unknown as ReceiptSale);
        } catch {
            // A thrown error here (as opposed to `res.ok === false`) means the
            // request never got a real answer from the server — most likely
            // the connection dropped mid-checkout. Queue it for automatic
            // retry instead of making the cashier remember to resubmit; from
            // their perspective the sale is done, so treat it like a success.
            enqueueOfflineSale({ clientRef, activeShiftId, items: saleItems, payments, options, enqueuedAt: Date.now() });
            playSaleSound();
            setQueuedOffline(true);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-border flex flex-col max-h-[90vh]">

                {queuedOffline ? (
                    <div className="p-8 flex flex-col items-center text-center gap-4">
                        <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center">
                            <CloudOff className="w-7 h-7 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Venta guardada, sin conexión</h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                No hay conexión con el servidor en este momento. La venta por {formatMoney(orderTotal)} quedó guardada
                                y se enviará sola apenas vuelva la conexión — no necesitas repetirla.
                            </p>
                        </div>
                        <Button onClick={onSuccess} className="w-full rounded-2xl h-12 font-bold">Continuar</Button>
                    </div>
                ) : completedSale || collected ? (
                    <SaleSuccess
                        sale={completedSale}
                        change={change}
                        title={collected ? "Pago registrado" : "¡Venta registrada!"}
                        subtitle={collected ? "Continúa con la siguiente persona." : undefined}
                        subAccountLabel={subAccountLabel}
                        onClose={onSuccess}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <div className="bg-primary/5 p-6 border-b border-border/50 relative flex flex-col items-center">
                            <button onClick={onCancel} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors bg-background hover:bg-muted p-2 rounded-full shadow-sm border border-border">
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                <ReceiptIcon className="w-7 h-7 text-primary" />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight">
                                {subAccountLabel ? subAccountLabel : "Checkout"}
                            </h2>
                            <p className="text-muted-foreground text-sm font-medium mt-1">
                                Total a cobrar:{" "}
                                <span className="text-foreground text-xl font-bold ml-1">{formatMoney(orderTotal)}</span>
                            </p>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Customer picker */}
                            {mode === "sale" && <CustomerPicker onSelect={(c) => setCustomerId(c?.id ?? null)} />}

                            {/* Quick cash buttons */}
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={() => setCash(String(Math.ceil(orderTotal)))}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors">
                                    Exacto {formatMoney(orderTotal)}
                                </button>
                                {QUICK_BILLS.filter((b) => b >= orderTotal).slice(0, 3).map((b) => (
                                    <button key={b} type="button" onClick={() => setCash(String(b))}
                                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-muted text-foreground border border-border hover:border-primary hover:text-primary transition-colors">
                                        {formatMoney(b)}
                                    </button>
                                ))}
                            </div>

                            {/* Payment methods */}
                            <div className="space-y-3">
                                {[
                                    { label: "Efectivo", icon: <Banknote className="w-5 h-5 text-green-600 dark:text-green-500" />, value: cash, set: setCash },
                                    { label: "Tarjeta / Datáfono", icon: <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-500" />, value: card, set: setCard },
                                    { label: "Transferencia (Nequi / Daviplata)", icon: <ArrowRightLeft className="w-5 h-5 text-purple-600 dark:text-purple-500" />, value: transfer, set: setTransfer },
                                ].map(({ label, icon, value, set }) => (
                                    <div key={label} className="bg-accent/30 p-4 rounded-3xl border border-border">
                                        <label className="text-sm font-semibold flex items-center gap-2 mb-2 text-foreground">
                                            {icon}{label}
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                                            <Input
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                value={value}
                                                onChange={(e) => set(e.target.value)}
                                                placeholder="0"
                                                className="pl-8 h-12 text-lg rounded-2xl bg-background border-transparent shadow-sm focus-visible:ring-primary focus-visible:border-primary transition-all"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* Footer totals */}
                        <div className="p-6 bg-muted/30 border-t border-border mt-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-background p-4 rounded-2xl border border-border shadow-sm flex flex-col justify-center items-center">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Restante</span>
                                    <span className={`text-xl font-black ${remaining > 0 ? "text-destructive" : "text-emerald-500"}`}>
                                        {formatMoney(remaining)}
                                    </span>
                                </div>
                                <div className="bg-background p-4 rounded-2xl border border-border shadow-sm flex flex-col justify-center items-center">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Vuelto / Cambio</span>
                                    <span className="text-xl font-black text-primary">{formatMoney(change)}</span>
                                </div>
                            </div>
                            <Button
                                onClick={handleCheckout}
                                disabled={loading || !canSubmit}
                                className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all"
                            >
                                {loading ? "PROCESANDO..." : mode === "collect" ? "REGISTRAR PAGO" : "FINALIZAR VENTA"}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
