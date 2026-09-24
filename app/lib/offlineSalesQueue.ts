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
    /** Cashier-facing summary only (item count + the total shown at checkout
     * time) — never used for the actual sale, which is always recomputed
     * server-side. Optional so older/queued entries and existing tests
     * without it keep working; only used to render the review panel. */
    summary?: { itemCount: number; total: number };
}

/** A queued sale the server actually rejected (a real business-rule failure,
 * not a dropped connection) — needs a human decision, never silently retried
 * forever nor silently discarded. See docs/18-Offline-First-POS.md fase 3. */
export interface RejectedSale extends PendingSale {
    error: string;
    rejectedAt: number;
}

interface OfflineQueueState {
    pending: PendingSale[];
    needsReview: RejectedSale[];
    flushing: boolean;
    enqueue: (sale: PendingSale) => void;
    remove: (clientRef: string) => void;
    setFlushing: (v: boolean) => void;
    addNeedsReview: (sale: RejectedSale) => void;
    dismissReview: (clientRef: string) => void;
}

/** Persisted so a page reload (or the cashier just closing the laptop lid
 * mid-outage) doesn't lose a sale that's still waiting to go out. */
export const useOfflineSalesQueue = create<OfflineQueueState>()(
    persist(
        (set) => ({
            pending: [],
            needsReview: [],
            flushing: false,
            enqueue: (sale) => set((s) => ({ pending: [...s.pending, sale] })),
            remove: (clientRef) => set((s) => ({ pending: s.pending.filter((p) => p.clientRef !== clientRef) })),
            setFlushing: (v) => set({ flushing: v }),
            addNeedsReview: (sale) => set((s) => ({
                // Replace, not duplicate, if this clientRef was already under review
                // (e.g. a manual retry from the review panel that failed again).
                needsReview: [...s.needsReview.filter((r) => r.clientRef !== sale.clientRef), sale],
            })),
            dismissReview: (clientRef) => set((s) => ({ needsReview: s.needsReview.filter((r) => r.clientRef !== clientRef) })),
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
 * the rest of the queue while still offline. A real rejection (stock ran
 * out, the shift closed, a price/promo changed while offline...) moves the
 * sale to `needsReview` instead of retrying it forever or dropping it
 * silently — see ReviewPanel.tsx for the cashier-facing side of this.
 */
export async function flushOfflineSalesQueue() {
    const { pending, flushing, setFlushing, remove, addNeedsReview } = useOfflineSalesQueue.getState();
    if (flushing || pending.length === 0) return;
    setFlushing(true);
    try {
        for (const sale of pending) {
            try {
                const res = await processSale(sale.activeShiftId, sale.items, sale.payments, sale.options);
                remove(sale.clientRef);
                if (!res.ok) {
                    console.error("[offlineSalesQueue] queued sale rejected by the server, needs review:", sale.clientRef, res.error);
                    addNeedsReview({ ...sale, error: res.error, rejectedAt: Date.now() });
                }
            } catch (err) {
                console.warn("[offlineSalesQueue] still offline, will retry later:", sale.clientRef, err);
                break;
            }
        }
    } finally {
        setFlushing(false);
    }
}

/** Re-attempts a single sale from the review panel (the cashier chose
 * "reintentar"). On success it's gone for good; on a fresh rejection the
 * review entry is updated with the new reason instead of disappearing. */
export async function retryReviewSale(clientRef: string) {
    const { needsReview, remove, addNeedsReview, dismissReview } = useOfflineSalesQueue.getState();
    const sale = needsReview.find((r) => r.clientRef === clientRef);
    if (!sale) return;
    try {
        const res = await processSale(sale.activeShiftId, sale.items, sale.payments, sale.options);
        if (res.ok) {
            dismissReview(clientRef);
            remove(clientRef);
        } else {
            addNeedsReview({ ...sale, error: res.error, rejectedAt: Date.now() });
        }
    } catch (err) {
        console.warn("[offlineSalesQueue] retry from review panel failed to reach the server:", clientRef, err);
    }
}
