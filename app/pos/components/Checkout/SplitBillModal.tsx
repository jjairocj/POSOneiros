"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
    X, Plus, Pencil, CheckCircle2, Users, SplitSquareHorizontal, Minus,
} from "lucide-react";
import { CartItem } from "@/app/types/cart";
import { useSubAccountStore } from "@/app/store/useSubAccountStore";
import { formatMoney } from "@/app/lib/money";
import CheckoutModal from "./CheckoutModal";

interface SplitBillModalProps {
    activeShiftId: string;
    items: CartItem[];
    onClose: () => void;
}

// ─── Quantity Picker ──────────────────────────────────────────────────────────

function QuantityPicker({
    max,
    value,
    onChange,
}: {
    max: number;
    value: number;
    onChange: (q: number) => void;
}) {
    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={() => onChange(Math.max(1, value - 1))}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
                <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-lg">{value}</span>
            <button
                type="button"
                onClick={() => onChange(Math.min(max, value + 1))}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Item Row (left panel) ────────────────────────────────────────────────────

function ItemRow({
    item,
    assignedQty,
    isPending,
    onSelect,
}: {
    item: CartItem;
    assignedQty: number;
    isPending: boolean;
    onSelect: () => void;
}) {
    const remaining = item.quantity - assignedQty;
    const fullyAssigned = remaining <= 0;

    return (
        <button
            type="button"
            onClick={onSelect}
            disabled={fullyAssigned}
            className={[
                "w-full text-left px-3 py-2.5 rounded-2xl border transition-all duration-150 text-sm",
                isPending
                    ? "ring-2 ring-primary bg-primary/10 border-primary"
                    : fullyAssigned
                        ? "opacity-40 cursor-not-allowed border-border/40 bg-muted/20"
                        : "border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-primary/5",
            ].join(" ")}
        >
            <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground truncate pr-2">{item.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">×{item.quantity}</span>
            </div>
            <div className="flex justify-between items-center mt-0.5">
                <span className="text-xs text-muted-foreground">{formatMoney(item.price)}</span>
                {assignedQty > 0 && !fullyAssigned && (
                    <span className="text-xs font-semibold text-amber-500">
                        {remaining} sin asignar
                    </span>
                )}
                {fullyAssigned && (
                    <span className="text-xs font-semibold text-emerald-500">Asignado</span>
                )}
            </div>
        </button>
    );
}

// ─── SubAccount Card ──────────────────────────────────────────────────────────

function SubAccountCard({
    sa,
    isPendingTarget,
    activeShiftId,
    onTap,
    onUnassign,
    onRename,
    onRemove,
    onPaid,
    onSetAmount,
}: {
    sa: import("@/app/types/cart").SubAccount;
    isPendingTarget: boolean;
    activeShiftId: string;
    onTap: () => void;
    onUnassign: (itemId: string) => void;
    onRename: (label: string) => void;
    onRemove: () => void;
    onPaid: () => void;
    onSetAmount: (amount: number) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [labelDraft, setLabelDraft] = useState(sa.label);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [editingAmount, setEditingAmount] = useState(false);
    const [amountDraft, setAmountDraft] = useState("");

    const commitRename = () => {
        if (labelDraft.trim()) onRename(labelDraft.trim());
        else setLabelDraft(sa.label);
        setEditing(false);
    };

    return (
        <>
            <div
                onClick={isPendingTarget ? onTap : undefined}
                className={[
                    "rounded-2xl border p-3 transition-all duration-150",
                    sa.paid
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : isPendingTarget
                            ? "ring-2 ring-primary/60 border-primary/50 bg-primary/5 cursor-pointer hover:bg-primary/10"
                            : "border-border/50 bg-muted/30",
                ].join(" ")}
            >
                {/* Card header */}
                <div className="flex items-center justify-between mb-2">
                    {editing ? (
                        <input
                            autoFocus
                            value={labelDraft}
                            onChange={e => setLabelDraft(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setLabelDraft(sa.label); setEditing(false); } }}
                            className="font-bold text-sm bg-transparent border-b border-primary outline-none text-foreground w-32"
                        />
                    ) : (
                        <button
                            type="button"
                            onClick={e => { e.stopPropagation(); setEditing(true); }}
                            className="flex items-center gap-1.5 font-bold text-sm text-foreground hover:text-primary transition-colors"
                        >
                            {sa.label}
                            {!sa.paid && <Pencil className="w-3 h-3 text-muted-foreground" />}
                        </button>
                    )}
                    <div className="flex items-center gap-1.5">
                        {sa.paid ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-500">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Pagado
                            </span>
                        ) : (
                            <>
                                {sa.items.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={e => { e.stopPropagation(); onRemove(); }}
                                        className="text-destructive/60 hover:text-destructive transition-colors p-0.5"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    type="button"
                                    disabled={sa.items.length === 0 && sa.customAmount === undefined}
                                    onClick={e => { e.stopPropagation(); setCheckoutOpen(true); }}
                                    className={[
                                        "text-xs font-bold px-2.5 py-1 rounded-xl transition-all",
                                        sa.items.length > 0 || sa.customAmount !== undefined
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                            : "bg-muted text-muted-foreground cursor-not-allowed opacity-50",
                                    ].join(" ")}
                                >
                                    Cobrar
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Assigned items */}
                {sa.items.length > 0 ? (
                    <ul className="space-y-1 mb-2">
                        {sa.items.map(item => (
                            <li key={item.id} className="flex items-center justify-between text-xs">
                                <span className="text-foreground/80 truncate pr-2">
                                    {item.name} ×{item.quantity}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-muted-foreground">
                                        {formatMoney(item.price * item.quantity)}
                                    </span>
                                    {!sa.paid && (
                                        <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); onUnassign(item.id); }}
                                            className="text-destructive/60 hover:text-destructive transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : sa.customAmount === undefined ? (
                    <p className="text-xs text-muted-foreground/60 italic mb-2">
                        {isPendingTarget ? "Toca para asignar ítem aquí" : "Sin ítems asignados"}
                    </p>
                ) : null}

                {/* Amount to charge */}
                {(sa.customAmount !== undefined || sa.items.length > 0) && (
                    <div className="flex justify-between items-center pt-2 border-t border-border/30">
                        <span className="text-xs text-muted-foreground font-medium">A cobrar</span>
                        {editingAmount ? (
                            <input
                                autoFocus
                                type="number"
                                step={50}
                                value={amountDraft}
                                onChange={e => setAmountDraft(e.target.value)}
                                onBlur={() => {
                                    const v = Math.round(Number(amountDraft) / 50) * 50;
                                    if (v > 0) onSetAmount(v);
                                    setEditingAmount(false);
                                }}
                                onKeyDown={e => {
                                    if (e.key === "Enter") {
                                        const v = Math.round(Number(amountDraft) / 50) * 50;
                                        if (v > 0) onSetAmount(v);
                                        setEditingAmount(false);
                                    }
                                    if (e.key === "Escape") setEditingAmount(false);
                                }}
                                className="w-28 text-right text-sm font-black bg-transparent border-b border-primary outline-none text-foreground"
                            />
                        ) : (
                            <button
                                type="button"
                                disabled={sa.paid}
                                onClick={e => {
                                    e.stopPropagation();
                                    setAmountDraft(String(sa.customAmount ?? sa.total));
                                    setEditingAmount(true);
                                }}
                                className="flex items-center gap-1 text-sm font-black text-foreground hover:text-primary transition-colors disabled:pointer-events-none"
                            >
                                {formatMoney(sa.customAmount ?? sa.total)}
                                {!sa.paid && <Pencil className="w-3 h-3 text-muted-foreground" />}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Inline CheckoutModal for this subaccount */}
            {checkoutOpen && (
                <CheckoutModal
                    activeShiftId={activeShiftId}
                    orderTotal={sa.customAmount ?? sa.total}
                    items={sa.items}
                    onSuccess={() => {
                        setCheckoutOpen(false);
                        onPaid();
                    }}
                    onCancel={() => setCheckoutOpen(false)}
                />
            )}
        </>
    );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function SplitBillModal({ activeShiftId, items, onClose }: SplitBillModalProps) {
    const {
        subAccounts, pendingItemId, pendingQty,
        cancelSplit, addSubAccount, removeSubAccount, renameSubAccount,
        setPendingItem, assignItem, unassignItem, splitEqually, setCustomAmount, markPaid, allPaid,
    } = useSubAccountStore();

    const cartTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const [localQty, setLocalQty] = useState(1);
    const [pendingItemForPicker, setPendingItemForPicker] = useState<CartItem | null>(null);

    // Compute assigned quantities per item
    const assignedQtyMap: Record<string, number> = {};
    for (const sa of subAccounts) {
        for (const si of sa.items) {
            assignedQtyMap[si.id] = (assignedQtyMap[si.id] ?? 0) + si.quantity;
        }
    }

    const handleItemClick = (item: CartItem) => {
        if (pendingItemId === item.id) {
            // Deselect
            setPendingItem(null);
            setPendingItemForPicker(null);
        } else {
            const remaining = item.quantity - (assignedQtyMap[item.id] ?? 0);
            if (remaining <= 0) return;
            const qty = Math.min(1, remaining);
            setLocalQty(qty);
            setPendingItemForPicker(item);
            setPendingItem(item.id, qty);
        }
    };

    const handleSubAccountTap = (subAccountId: string) => {
        if (!pendingItemId || !pendingItemForPicker) return;
        const remaining = pendingItemForPicker.quantity - (assignedQtyMap[pendingItemForPicker.id] ?? 0);
        const qty = Math.min(localQty, remaining);
        assignItem(subAccountId, pendingItemForPicker, qty);
        setPendingItemForPicker(null);
        setLocalQty(1);
    };

    const handleCancel = () => {
        cancelSplit();
        onClose();
    };

    const handleAllDone = () => {
        cancelSplit();
        onClose();
    };

    const everythingPaid = allPaid() && subAccounts.length > 0;

    const maxForPending = pendingItemForPicker
        ? pendingItemForPicker.quantity - (assignedQtyMap[pendingItemForPicker.id] ?? 0)
        : 1;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-3xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl border border-border flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-primary/5 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <h2 className="text-lg font-black tracking-tight">Dividir Cuenta</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {everythingPaid ? (
                    /* ── All paid success ── */
                    <div className="flex flex-col items-center justify-center p-12 gap-6 text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <CheckCircle2 className="w-12 h-12 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-foreground">¡Cuenta cerrada!</h3>
                            <p className="text-muted-foreground mt-1 text-sm">Todas las partes han sido cobradas.</p>
                        </div>
                        <button
                            type="button"
                            onClick={handleAllDone}
                            className="px-8 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors"
                        >
                            Listo
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Pending item qty picker banner */}
                        {pendingItemId && pendingItemForPicker && (
                            <div className="px-5 py-3 bg-primary/10 border-b border-primary/20 flex items-center justify-between shrink-0 gap-4">
                                <div className="text-sm font-semibold text-foreground truncate">
                                    <span className="text-primary">Asignando:</span> {pendingItemForPicker.name}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-xs text-muted-foreground">Cant.</span>
                                    <QuantityPicker
                                        max={maxForPending}
                                        value={localQty}
                                        onChange={(q) => { setLocalQty(q); setPendingItem(pendingItemId, q); }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setPendingItem(null); setPendingItemForPicker(null); }}
                                        className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Two-panel body */}
                        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">

                            {/* Left: Items */}
                            <div className="sm:w-[42%] flex flex-col border-b sm:border-b-0 sm:border-r border-border/50">
                                <div className="px-4 py-2.5 bg-muted/20 border-b border-border/30 shrink-0">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ítems del pedido</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                    {items.map(item => (
                                        <ItemRow
                                            key={item.id}
                                            item={item}
                                            assignedQty={assignedQtyMap[item.id] ?? 0}
                                            isPending={pendingItemId === item.id}
                                            onSelect={() => handleItemClick(item)}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Right: SubAccounts */}
                            <div className="sm:flex-1 flex flex-col">
                                <div className="px-4 py-2.5 bg-muted/20 border-b border-border/30 shrink-0">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personas</p>
                                </div>
                                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                                    {subAccounts.map(sa => (
                                        <SubAccountCard
                                            key={sa.id}
                                            sa={sa}
                                            isPendingTarget={!!pendingItemId}
                                            activeShiftId={activeShiftId}
                                            onTap={() => handleSubAccountTap(sa.id)}
                                            onUnassign={(itemId) => unassignItem(sa.id, itemId)}
                                            onRename={(label) => renameSubAccount(sa.id, label)}
                                            onRemove={() => removeSubAccount(sa.id)}
                                            onPaid={() => markPaid(sa.id)}
                                            onSetAmount={(amount) => setCustomAmount(sa.id, amount)}
                                        />
                                    ))}

                                    {subAccounts.length < 8 && (
                                        <button
                                            type="button"
                                            onClick={addSubAccount}
                                            className="w-full py-2.5 rounded-2xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> Agregar persona
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => splitEqually(items, cartTotal)}
                                className="flex-1 py-2.5 text-sm font-semibold rounded-2xl border border-border bg-background hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                                <SplitSquareHorizontal className="w-4 h-4" />
                                Dividir equitativamente
                            </button>
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2.5 text-sm font-semibold rounded-2xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
