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
