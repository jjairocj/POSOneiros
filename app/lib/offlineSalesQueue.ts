"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { processSale, type PaymentInput, type ProcessSaleOptions, type SaleLineInput } from "@/app/actions/sale";

export interface PendingSale {
    clientRef: string;
    activeShiftId: string;
    items: SaleLineInput[];
    payments: PaymentInput[];
    options: ProcessSaleOptions;
    enqueuedAt: number;
}

interface OfflineQueueState {
    pending: PendingSale[];
    flushing: boolean;
    enqueue: (sale: PendingSale) => void;
    remove: (clientRef: string) => void;
    setFlushing: (v: boolean) => void;
}

/** Persisted so a page reload (or the cashier just closing the laptop lid
 * mid-outage) doesn't lose a sale that's still waiting to go out. */
export const useOfflineSalesQueue = create<OfflineQueueState>()(
    persist(
        (set) => ({
            pending: [],
            flushing: false,
            enqueue: (sale) => set((s) => ({ pending: [...s.pending, sale] })),
            remove: (clientRef) => set((s) => ({ pending: s.pending.filter((p) => p.clientRef !== clientRef) })),
            setFlushing: (v) => set({ flushing: v }),
        }),
        { name: "oneiros-offline-sales-queue" }
    )
);

/**
 * Attempts to (re)send every queued sale, oldest first. Safe to call
 * repeatedly (on an interval, on the browser's `online` event, on mount) —
 * `clientRef` makes each attempt idempotent server-side, so a sale that
 * actually landed on a previous try is recognized and not duplicated.
 *
 * Stops at the first sale that still fails to reach the server at all
 * (a thrown network error, not a real rejection) rather than burning through
 * the rest of the queue while still offline.
 */
export async function flushOfflineSalesQueue() {
    const { pending, flushing, setFlushing, remove } = useOfflineSalesQueue.getState();
    if (flushing || pending.length === 0) return;
    setFlushing(true);
    try {
        for (const sale of pending) {
            try {
                const res = await processSale(sale.activeShiftId, sale.items, sale.payments, sale.options);
                remove(sale.clientRef);
                if (!res.ok) console.error("[offlineSalesQueue] queued sale rejected by the server, dropped:", sale.clientRef, res.error);
            } catch (err) {
                console.warn("[offlineSalesQueue] still offline, will retry later:", sale.clientRef, err);
                break;
            }
        }
    } finally {
        setFlushing(false);
    }
}
