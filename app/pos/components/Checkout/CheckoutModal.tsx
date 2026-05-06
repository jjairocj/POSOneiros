"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Receipt as ReceiptIcon, X, Banknote, CreditCard, ArrowRightLeft,
    CheckCircle2, Printer, UserSearch, UserPlus, ChevronDown, ChevronUp, Search, User,
} from "lucide-react";
import { processSale } from "../../../actions/sale";
import { searchCustomers, createCustomer, type CustomerResult } from "../../../actions/customers";
import Receipt from "./Receipt";
import { playSaleSound } from "@/app/lib/sound";

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
        try {
            const c = await createCustomer({ fullName: newName, documentId: newDoc, phone: newPhone });
            pick(c);
            setCreating(false);
            setNewName(""); setNewDoc(""); setNewPhone("");
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
}: {
    activeShiftId: string;
    orderTotal: number;
    items: any[];
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const [loading, setLoading] = useState(false);
    const [cash, setCash] = useState("");
    const [card, setCard] = useState("");
    const [transfer, setTransfer] = useState("");
    const [error, setError] = useState("");
    const [completedSale, setCompletedSale] = useState<any>(null);
    const [customerId, setCustomerId] = useState<string | null>(null);

    const cashAmount = parseFloat(cash) || 0;
    const cardAmount = parseFloat(card) || 0;
    const transferAmount = parseFloat(transfer) || 0;
    const totalPaid = cashAmount + cardAmount + transferAmount;
    const remaining = Math.max(0, orderTotal - totalPaid);
    const change = Math.max(0, totalPaid - orderTotal);
    const canSubmit = totalPaid >= orderTotal && items.length > 0;

    const handleCheckout = async () => {
        if (!canSubmit) return;
        setLoading(true);
        setError("");
        try {
            let amountToCover = orderTotal;
            const payments = [];
            if (cardAmount > 0) {
                const applied = Math.min(amountToCover, cardAmount);
                payments.push({ method: "CARD", amount: applied });
                amountToCover -= applied;
            }
            if (transferAmount > 0) {
                const applied = Math.min(amountToCover, transferAmount);
                payments.push({ method: "TRANSFER", amount: applied });
                amountToCover -= applied;
            }
            if (cashAmount > 0 && amountToCover > 0) {
                payments.push({ method: "CASH", amount: amountToCover });
            }
            const sale = await processSale(activeShiftId, items, payments, customerId ?? undefined);
            playSaleSound();
            setCompletedSale(sale);
        } catch (err: any) {
            setError(err.message || "Error procesando el pago");
            setLoading(false);
        }
    };

    const handlePrintTicket = () => {
        const receiptNode = document.getElementById("print-receipt");
        if (!receiptNode) return;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);
        const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(node => node.outerHTML).join("");
        const content = receiptNode.cloneNode(true) as HTMLElement;
        content.classList.remove("hidden");
        content.classList.add("block");
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`<html><head>${styles}<style>@page{margin:0}body{margin:0;padding:0;background:white}</style></head><body>${content.outerHTML}</body></html>`);
            doc.close();
            iframe.contentWindow?.focus();
            setTimeout(() => {
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 1000);
            }, 500);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-border flex flex-col max-h-[90vh]">

                {completedSale ? (
                    // ── Success stage ──
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="relative flex items-center justify-center">
                            <span className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "1s", animationIterationCount: 2 }} />
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-in zoom-in duration-300">
                                <CheckCircle2 className="w-14 h-14 text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-foreground mb-2">¡Venta Exitosa!</h2>
                            {change > 0 ? (
                                <p className="text-muted-foreground">
                                    Cambio a entregar:{" "}
                                    <strong className="text-2xl text-emerald-500 block mt-1">${change.toLocaleString()}</strong>
                                </p>
                            ) : (
                                <p className="text-muted-foreground">Pago exacto recibido.</p>
                            )}
                        </div>
                        <div className="flex w-full gap-4 mt-8 pt-6 border-t border-border">
                            <Button variant="outline" className="flex-1 h-14 rounded-2xl text-base font-bold" onClick={onSuccess}>
                                Cerrar
                            </Button>
                            <Button className="flex-1 h-14 rounded-2xl text-base font-bold shadow-lg" onClick={handlePrintTicket}>
                                <Printer className="w-5 h-5 mr-2" /> Imprimir Ticket
                            </Button>
                        </div>
                        <div className="hidden" id="print-receipt">
                            <Receipt sale={completedSale} />
                        </div>
                    </div>
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
                            <h2 className="text-2xl font-black tracking-tight">Checkout</h2>
                            <p className="text-muted-foreground text-sm font-medium mt-1">
                                Total a cobrar:{" "}
                                <span className="text-foreground text-xl font-bold ml-1">${orderTotal.toLocaleString()}</span>
                            </p>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* Customer picker */}
                            <CustomerPicker onSelect={(c) => setCustomerId(c?.id ?? null)} />

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
                                        ${remaining.toLocaleString()}
                                    </span>
                                </div>
                                <div className="bg-background p-4 rounded-2xl border border-border shadow-sm flex flex-col justify-center items-center">
                                    <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Vuelto / Cambio</span>
                                    <span className="text-xl font-black text-primary">${change.toLocaleString()}</span>
                                </div>
                            </div>
                            <Button
                                onClick={handleCheckout}
                                disabled={loading || !canSubmit}
                                className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 hover:-translate-y-0.5 transition-all"
                            >
                                {loading ? "PROCESANDO..." : "FINALIZAR VENTA"}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
