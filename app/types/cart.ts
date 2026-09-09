export interface ProductInput {
    id: string;
    name: string;
    price: number;
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    imageUrl?: string | null;
    categoryId?: string | null;
}

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    /** Discount on this line, in COP (whole line, not per unit). */
    discount?: number;
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    imageUrl?: string | null;
    categoryId?: string | null;
}

/** Order-level discount: a percentage of the (line-discounted) base or a fixed COP amount. */
export interface OrderDiscount {
    type: "percent" | "amount";
    value: number;
}

export interface OrderTotals {
    /** Gross base before any discount. */
    subtotal: number;
    /** Total discount (line + order), already subtracted from total. */
    discount: number;
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    total: number;
}

export interface Order extends OrderTotals {
    id: string;
    name: string;
    items: CartItem[];
    orderDiscount?: OrderDiscount | null;
    createdAt: number;
}

export interface SubAccount {
    id: string;
    label: string;
    items: CartItem[];
    subtotal: number;
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    total: number;
    customAmount?: number; // overrides total in checkout (editable, multiple of 50)
    paid: boolean;
    /** Payments collected for this person (recorded when paid). */
    payments?: SubAccountPayment[];
}

export interface SubAccountPayment {
    method: "CASH" | "CARD" | "TRANSFER";
    amount: number;
}
