"use client";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string | null;
    categoryId?: string | null;
}

export interface Order {
    id: string;
    name: string; // e.g., "Mesa 1" or "Cliente A"
    items: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    createdAt: number;
}

interface CartStore {
    orders: Record<string, Order>;
    activeOrderId: string;

    // Actions
    setActiveOrder: (orderId: string) => void;
    addOrder: (name: string) => string;
    removeOrder: (orderId: string) => void;

    // Item Actions (operate on active order)
    addItem: (product: any) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearActiveOrder: () => void;
}

const TAX_RATE = 0.19;

const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    return { subtotal, tax, total };
};

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            orders: {
                'default': {
                    id: 'default',
                    name: 'Orden Principal',
                    items: [],
                    subtotal: 0,
                    tax: 0,
                    total: 0,
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
                        [id]: {
                            id,
                            name,
                            items: [],
                            subtotal: 0,
                            tax: 0,
                            total: 0,
                            createdAt: Date.now()
                        }
                    },
                    activeOrderId: id
                }));
                return id;
            },

            removeOrder: (orderId) => {
                set((state) => {
                    const newOrders = { ...state.orders };
                    delete newOrders[orderId];

                    // Fallback to default if we delete the active one or if no orders left
                    let nextActive = state.activeOrderId;
                    if (state.activeOrderId === orderId || Object.keys(newOrders).length === 0) {
                        if (Object.keys(newOrders).length === 0) {
                            const defaultId = 'default';
                            newOrders[defaultId] = {
                                id: defaultId,
                                name: 'Orden Principal',
                                items: [],
                                subtotal: 0,
                                tax: 0,
                                total: 0,
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

                    const existingItem = activeOrder.items.find((item) => item.id === product.id);
                    let newItems;
                    if (existingItem) {
                        newItems = activeOrder.items.map((item) =>
                            item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                        );
                    } else {
                        newItems = [...activeOrder.items, {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            imageUrl: product.imageUrl,
                            categoryId: product.categoryId,
                            quantity: 1
                        }];
                    }

                    const totals = calculateTotals(newItems);
                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: {
                                ...activeOrder,
                                items: newItems,
                                ...totals
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
                    const totals = calculateTotals(newItems);

                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: {
                                ...activeOrder,
                                items: newItems,
                                ...totals
                            }
                        }
                    };
                });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) {
                    get().removeItem(productId);
                    return;
                }

                set((state) => {
                    const activeOrder = state.orders[state.activeOrderId];
                    if (!activeOrder) return state;

                    const newItems = activeOrder.items.map((item) =>
                        item.id === productId ? { ...item, quantity } : item
                    );
                    const totals = calculateTotals(newItems);

                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: {
                                ...activeOrder,
                                items: newItems,
                                ...totals
                            }
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
                            [state.activeOrderId]: {
                                ...activeOrder,
                                items: [],
                                subtotal: 0,
                                tax: 0,
                                total: 0
                            }
                        }
                    };
                });
            }
        }),
        { name: 'oneiros-multi-cart' }
    )
);
