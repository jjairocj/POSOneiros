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
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    imageUrl?: string | null;
    categoryId?: string | null;
}

export interface OrderTotals {
    subtotal: number;
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    total: number;
}

export interface Order extends OrderTotals {
    id: string;
    name: string;
    items: CartItem[];
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
