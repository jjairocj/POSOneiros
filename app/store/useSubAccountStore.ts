"use client";
import { create } from "zustand";
import { SubAccount, CartItem, SubAccountPayment } from "@/app/types/cart";
import { calculateOrderTotals } from "@/app/lib/tax";

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

function recalc(sa: SubAccount): SubAccount {
    return { ...sa, ...calculateOrderTotals(sa.items) };
}

function roundTo50(amount: number): number {
    return Math.round(amount / 50) * 50;
}

interface SubAccountStore {
    active: boolean;
    subAccounts: SubAccount[];
    pendingItemId: string | null;
    pendingQty: number;

    initSplit: (items: CartItem[]) => void;
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

    initSplit: () => {
        set({
            active: true,
            subAccounts: [makeSubAccount("Persona 1"), makeSubAccount("Persona 2")],
            pendingItemId: null,
            pendingQty: 1,
        });
    },

    cancelSplit: () => {
        set({ active: false, subAccounts: [], pendingItemId: null, pendingQty: 1 });
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
        set(state => ({
            subAccounts: state.subAccounts.map(sa => {
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
                return recalc({ ...sa, items: newItems });
            }),
            pendingItemId: null,
            pendingQty: 1,
        }));
    },

    unassignItem: (subAccountId, itemId) => {
        set(state => ({
            subAccounts: state.subAccounts.map(sa => {
                if (sa.id !== subAccountId) return sa;
                return recalc({ ...sa, items: sa.items.filter(i => i.id !== itemId) });
            }),
        }));
    },

    splitEqually: (items, cartTotal) => {
        const { subAccounts } = get();
        const n = subAccounts.length;
        if (n === 0) return;

        // Divide total amount equally, rounded to nearest $50. First person absorbs remainder.
        const perPerson = roundTo50(cartTotal / n);
        const firstAmount = cartTotal - perPerson * (n - 1);

        set({
            subAccounts: subAccounts.map((sa, i) =>
                recalc({ ...sa, items, customAmount: i === 0 ? firstAmount : perPerson })
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
