"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    taxIva: number;         // decimal (e.g. 0, 0.05, 0.19)
    taxIca: number;         // decimal (e.g. 0, 0.01)
    taxImpoConsumo: number; // decimal (e.g. 0, 0.08)
    imageUrl?: string | null;
    categoryId?: string | null;
}

export interface Order {
    id: string;
    name: string;
    items: CartItem[];
    subtotal: number;
    taxIva: number;
    taxIca: number;
    taxImpoConsumo: number;
    total: number;
    createdAt: number;
}

interface CartStore {
    orders: Record<string, Order>;
    activeOrderId: string;

    setActiveOrder: (orderId: string) => void;
    addOrder: (name: string) => string;
    removeOrder: (orderId: string) => void;

    addItem: (product: any) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearActiveOrder: () => void;
}

const toRate = (v: unknown) => (typeof v === 'number' ? v : 0);

const calculateTotals = (items: CartItem[]) => {
    let subtotal = 0, taxIva = 0, taxIca = 0, taxImpoConsumo = 0;
    for (const item of items) {
        const base = item.price * item.quantity;
        subtotal += base;
        taxIva += base * toRate(item.taxIva);
        taxIca += base * toRate(item.taxIca);
        taxImpoConsumo += base * toRate(item.taxImpoConsumo);
    }
    return { subtotal, taxIva, taxIca, taxImpoConsumo, total: subtotal + taxIva + taxIca + taxImpoConsumo };
};

const EMPTY_ORDER_TOTALS = { subtotal: 0, taxIva: 0, taxIca: 0, taxImpoConsumo: 0, total: 0 };

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            orders: {
                'default': {
                    id: 'default',
                    name: 'Orden Principal',
                    items: [],
                    ...EMPTY_ORDER_TOTALS,
                    createdAt: Date.now()
                }
            },
            activeOrderId: 'default',

            setActiveOrder: (orderId) => set({ activeOrderId: orderId }),

            addOrder: (name) => {
                const id = `order-${Date.now()}`;
                set((state) => ({
                    orders: {
                        ...state.orders,
                        [id]: { id, name, items: [], ...EMPTY_ORDER_TOTALS, createdAt: Date.now() }
                    },
                    activeOrderId: id
                }));
                return id;
            },

            removeOrder: (orderId) => {
                set((state) => {
                    const newOrders = { ...state.orders };
                    delete newOrders[orderId];

                    let nextActive = state.activeOrderId;
                    if (state.activeOrderId === orderId || Object.keys(newOrders).length === 0) {
                        if (Object.keys(newOrders).length === 0) {
                            const defaultId = 'default';
                            newOrders[defaultId] = {
                                id: defaultId,
                                name: 'Orden Principal',
                                items: [],
                                ...EMPTY_ORDER_TOTALS,
                                createdAt: Date.now()
                            };
                            nextActive = defaultId;
                        } else {
                            nextActive = Object.keys(newOrders)[0];
                        }
                    }

                    return { orders: newOrders, activeOrderId: nextActive };
                });
            },

            addItem: (product) => {
                set((state) => {
                    const activeOrder = state.orders[state.activeOrderId];
                    if (!activeOrder) return state;

                    // Taxes are stored as percentages (0, 5, 19) — convert to decimal
                    const taxIva = (product.taxIva ?? 0) / 100;
                    const taxIca = (product.taxIca ?? 0) / 100;
                    const taxImpoConsumo = (product.taxImpoConsumo ?? 0) / 100;

                    const existingItem = activeOrder.items.find((item) => item.id === product.id);
                    let newItems: CartItem[];
                    if (existingItem) {
                        newItems = activeOrder.items.map((item) =>
                            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                        );
                    } else {
                        newItems = [...activeOrder.items, {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            taxIva,
                            taxIca,
                            taxImpoConsumo,
                            imageUrl: product.imageUrl,
                            categoryId: product.categoryId,
                            quantity: 1
                        }];
                    }

                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: {
                                ...activeOrder,
                                items: newItems,
                                ...calculateTotals(newItems)
                            }
                        }
                    };
                });
            },

            removeItem: (productId) => {
                set((state) => {
                    const activeOrder = state.orders[state.activeOrderId];
                    if (!activeOrder) return state;
                    const newItems = activeOrder.items.filter((item) => item.id !== productId);
                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: { ...activeOrder, items: newItems, ...calculateTotals(newItems) }
                        }
                    };
                });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) { get().removeItem(productId); return; }
                set((state) => {
                    const activeOrder = state.orders[state.activeOrderId];
                    if (!activeOrder) return state;
                    const newItems = activeOrder.items.map((item) =>
                        item.id === productId ? { ...item, quantity } : item
                    );
                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: { ...activeOrder, items: newItems, ...calculateTotals(newItems) }
                        }
                    };
                });
            },

            clearActiveOrder: () => {
                set((state) => {
                    const activeOrder = state.orders[state.activeOrderId];
                    if (!activeOrder) return state;
                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: { ...activeOrder, items: [], ...EMPTY_ORDER_TOTALS }
                        }
                    };
                });
            }
        }),
        { name: 'oneiros-multi-cart' }
    )
);
