"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    taxRate: number; // taxIva as decimal (e.g. 0, 0.05, 0.19)
    imageUrl?: string | null;
    categoryId?: string | null;
}

export interface Order {
    id: string;
    name: string;
    items: CartItem[];
    subtotal: number;
    tax: number;
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

const calculateTotals = (items: CartItem[]) => {
    let subtotal = 0;
    let tax = 0;
    for (const item of items) {
        const itemSubtotal = item.price * item.quantity;
        // taxRate may be undefined in carts persisted before this fix — default to 0
        const rate = typeof item.taxRate === 'number' ? item.taxRate : 0;
        subtotal += itemSubtotal;
        tax += itemSubtotal * rate;
    }
    return { subtotal, tax, total: subtotal + tax };
};

const EMPTY_ORDER_TOTALS = { subtotal: 0, tax: 0, total: 0 };

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

                    // taxIva is stored as a percentage (0, 5, 19) — convert to decimal
                    const taxRate = typeof product.taxIva === 'number' ? product.taxIva / 100 : 0;

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
                            taxRate,
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
