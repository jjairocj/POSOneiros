"use client";
import { create } from "zustand";
import { SubAccount, CartItem, OrderDiscount, SubAccountPayment } from "@/app/types/cart";
import { splitOrderByItems } from "@/app/lib/tax";

function makeId(): string {
    return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeSubAccount(label: string): SubAccount {
    return {
        id: makeId(),
        label,
        items: [],
        subtotal: 0,
        taxIva: 0,
        taxIca: 0,
        taxImpoConsumo: 0,
        total: 0,
        paid: false,
    };
}

function roundTo50(amount: number): number {
    return Math.round(amount / 50) * 50;
}

/**
 * Recomputes every subaccount's totals together via splitOrderByItems, so
 * each one gets its fair share of the order-level discount — not just its
 * own items' totals in isolation (which has no way to know about a discount
 * applied to the whole order). Subaccounts using an equal-split
 * `customAmount` instead of item assignment (empty `items`) just get zeros
 * here; their card shows `customAmount` instead, see SplitBillModal.
 */
function recalcAll(subAccounts: SubAccount[], orderItems: CartItem[], orderDiscount: OrderDiscount | null): SubAccount[] {
    const shares = splitOrderByItems(
        orderItems,
        orderDiscount,
        subAccounts.map((sa) => ({ id: sa.id, items: sa.items.map((i) => ({ id: i.id, quantity: i.quantity })) }))
    );
    return subAccounts.map((sa) => ({ ...sa, ...shares[sa.id] }));
}

interface SubAccountStore {
    active: boolean;
    subAccounts: SubAccount[];
    pendingItemId: string | null;
    pendingQty: number;
    /** The full order being split — needed so each subaccount's totals can
     * be computed relative to the whole order's discount, not in isolation. */
    orderItems: CartItem[];
    orderDiscount: OrderDiscount | null;

    initSplit: (items: CartItem[], orderDiscount?: OrderDiscount | null) => void;
    cancelSplit: () => void;
    addSubAccount: () => void;
    removeSubAccount: (id: string) => void;
    renameSubAccount: (id: string, label: string) => void;
    setPendingItem: (itemId: string | null, qty?: number) => void;
    assignItem: (subAccountId: string, item: CartItem, quantity: number) => void;
    unassignItem: (subAccountId: string, itemId: string) => void;
    splitEqually: (items: CartItem[], cartTotal: number) => void;
    setCustomAmount: (id: string, amount: number) => void;
    markPaid: (id: string, payments?: SubAccountPayment[]) => void;
    allPaid: () => boolean;
}

export const useSubAccountStore = create<SubAccountStore>((set, get) => ({
    active: false,
    subAccounts: [],
    pendingItemId: null,
    pendingQty: 1,

    orderItems: [],
    orderDiscount: null,

    initSplit: (items, orderDiscount = null) => {
        set({
            active: true,
            subAccounts: [makeSubAccount("Persona 1"), makeSubAccount("Persona 2")],
            pendingItemId: null,
            pendingQty: 1,
            orderItems: items,
            orderDiscount,
        });
    },

    cancelSplit: () => {
        set({ active: false, subAccounts: [], pendingItemId: null, pendingQty: 1, orderItems: [], orderDiscount: null });
    },

    addSubAccount: () => {
        const { subAccounts } = get();
        if (subAccounts.length >= 8) return;
        set({ subAccounts: [...subAccounts, makeSubAccount(`Persona ${subAccounts.length + 1}`)] });
    },

    removeSubAccount: (id) => {
        const { subAccounts } = get();
        const sa = subAccounts.find(s => s.id === id);
        if (!sa || sa.items.length > 0) return;
        set({ subAccounts: subAccounts.filter(s => s.id !== id) });
    },

    renameSubAccount: (id, label) => {
        set(state => ({
            subAccounts: state.subAccounts.map(sa =>
                sa.id === id ? { ...sa, label } : sa
            ),
        }));
    },

    setPendingItem: (itemId, qty = 1) => {
        set({ pendingItemId: itemId, pendingQty: qty });
    },

    assignItem: (subAccountId, item, quantity) => {
        const { subAccounts, orderItems, orderDiscount } = get();
        const updated = subAccounts.map(sa => {
            if (sa.id !== subAccountId) return sa;
            const existing = sa.items.find(i => i.id === item.id);
            let newItems: CartItem[];
            if (existing) {
                newItems = sa.items.map(i =>
                    i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
                );
            } else {
                newItems = [...sa.items, { ...item, quantity }];
            }
            return { ...sa, items: newItems };
        });
        set({
            subAccounts: recalcAll(updated, orderItems, orderDiscount),
            pendingItemId: null,
            pendingQty: 1,
        });
    },

    unassignItem: (subAccountId, itemId) => {
        const { subAccounts, orderItems, orderDiscount } = get();
        const updated = subAccounts.map(sa =>
            sa.id === subAccountId ? { ...sa, items: sa.items.filter(i => i.id !== itemId) } : sa
        );
        set({ subAccounts: recalcAll(updated, orderItems, orderDiscount) });
    },

    // "Dividir equitativamente" is a distinct mode from item assignment: it
    // splits the order's real (discount-aware) total as pure money, with no
    // item-level pretense — each subaccount's `items` stays empty (never the
    // full order duplicated into every person's card, which used to render
    // as if everyone had ordered everything) and `customAmount` is what's
    // actually charged.
    splitEqually: (items, cartTotal) => {
        const { subAccounts } = get();
        const n = subAccounts.length;
        if (n === 0) return;

        // Divide total amount equally, rounded to nearest $50. First person absorbs remainder.
        const perPerson = roundTo50(cartTotal / n);
        const firstAmount = cartTotal - perPerson * (n - 1);

        set({
            subAccounts: subAccounts.map((sa, i) =>
                ({ ...sa, items: [], subtotal: 0, taxIva: 0, taxIca: 0, taxImpoConsumo: 0, total: 0, customAmount: i === 0 ? firstAmount : perPerson })
            ),
            pendingItemId: null,
        });
    },

    setCustomAmount: (id, amount) => {
        set(state => ({
            subAccounts: state.subAccounts.map(sa =>
                sa.id === id ? { ...sa, customAmount: roundTo50(amount) } : sa
            ),
        }));
    },

    markPaid: (id, payments = []) => {
        set(state => ({
            subAccounts: state.subAccounts.map(sa =>
                sa.id === id ? { ...sa, paid: true, payments } : sa
            ),
        }));
    },

    allPaid: () => {
        return get().subAccounts.every(sa => sa.paid);
    },
}));
