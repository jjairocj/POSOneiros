/**
 * Shift lifecycle: OPEN -> CLOSING -> CLOSED.
 * CLOSING = the cashier already submitted the closing count (it is frozen on
 * the server) and only has to confirm; the shift still occupies its register
 * and its owner, but can no longer sell. Kept free of server-only imports so
 * client components can use it too.
 */
export type ShiftStatus = "OPEN" | "CLOSING" | "CLOSED";

/** Statuses of a shift that is still "live" (holds a register / belongs to a working cashier). */
export const LIVE_SHIFT_STATUSES: ShiftStatus[] = ["OPEN", "CLOSING"];

export const SHIFT_STATUS_LABEL: Record<ShiftStatus, string> = {
    OPEN: "Abierto",
    CLOSING: "En cierre",
    CLOSED: "Cerrado",
};
