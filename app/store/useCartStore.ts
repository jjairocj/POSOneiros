"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Order, OrderDiscount, ProductInput } from "@/app/types/cart";
import { calculateOrderTotals, toDecimalRate, ZERO_TOTALS } from "@/app/lib/tax";

export type { CartItem, Order } from "@/app/types/cart";

interface CartStore {
    orders: Record<string, Order>;
    activeOrderId: string;

    setActiveOrder: (orderId: string) => void;
    addOrder: (name: string) => string;
    removeOrder: (orderId: string) => void;
    addItem: (product: ProductInput) => void;
    removeItem: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    setLineDiscount: (productId: string, discount: number) => void;
    setOrderDiscount: (discount: OrderDiscount | null) => void;
    clearActiveOrder: () => void;
}

const makeOrder = (id: string, name: string): Order => ({
    id,
    name,
    items: [],
    orderDiscount: null,
    ...ZERO_TOTALS,
    createdAt: Date.now(),
});

const withTotals = (order: Order, items: CartItem[], orderDiscount = order.orderDiscount): Order => ({
    ...order,
    items,
    orderDiscount,
    ...calculateOrderTotals(items, orderDiscount),
});

const DEFAULT_ORDER_ID = "default";

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            orders: { [DEFAULT_ORDER_ID]: makeOrder(DEFAULT_ORDER_ID, "Orden Principal") },
            activeOrderId: DEFAULT_ORDER_ID,

            setActiveOrder: (orderId) => set({ activeOrderId: orderId }),

            addOrder: (name) => {
                const id = `order-${Date.now()}`;
                set((state) => ({
                    orders: { ...state.orders, [id]: makeOrder(id, name) },
                    activeOrderId: id,
                }));
                return id;
            },

            removeOrder: (orderId) => {
                set((state) => {
                    const remaining = { ...state.orders };
                    delete remaining[orderId];

                    if (Object.keys(remaining).length === 0) {
                        remaining[DEFAULT_ORDER_ID] = makeOrder(DEFAULT_ORDER_ID, "Orden Principal");
                    }

                    const nextActive =
                        state.activeOrderId === orderId
                            ? Object.keys(remaining)[0]
                            : state.activeOrderId;

                    return { orders: remaining, activeOrderId: nextActive };
                });
            },

            addItem: (product) => {
                set((state) => {
                    const order = state.orders[state.activeOrderId];
                    if (!order) return state;

                    const existing = order.items.find((i) => i.id === product.id);
                    const newItems: CartItem[] = existing
                        ? order.items.map((i) =>
                              i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
                          )
                        : [
                              ...order.items,
                              {
                                  id: product.id,
                                  name: product.name,
                                  price: product.price,
                                  quantity: 1,
                                  taxIva: toDecimalRate(product.taxIva),
                                  taxIca: toDecimalRate(product.taxIca),
                                  taxImpoConsumo: toDecimalRate(product.taxImpoConsumo),
                                  imageUrl: product.imageUrl,
                                  categoryId: product.categoryId,
                              },
                          ];

                    return { orders: { ...state.orders, [state.activeOrderId]: withTotals(order, newItems) } };
                });
            },

            removeItem: (productId) => {
                set((state) => {
                    const order = state.orders[state.activeOrderId];
                    if (!order) return state;
                    const newItems = order.items.filter((i) => i.id !== productId);
                    return { orders: { ...state.orders, [state.activeOrderId]: withTotals(order, newItems) } };
                });
            },

            updateQuantity: (productId, quantity) => {
                if (quantity <= 0) { get().removeItem(productId); return; }
                set((state) => {
                    const order = state.orders[state.activeOrderId];
                    if (!order) return state;
                    const newItems = order.items.map((i) =>
                        i.id === productId ? { ...i, quantity } : i
                    );
                    return { orders: { ...state.orders, [state.activeOrderId]: withTotals(order, newItems) } };
                });
            },

            setLineDiscount: (productId, discount) => {
                set((state) => {
                    const order = state.orders[state.activeOrderId];
                    if (!order) return state;
                    const safe = Number.isFinite(discount) && discount > 0 ? Math.round(discount) : 0;
                    const newItems = order.items.map((i) =>
                        i.id === productId ? { ...i, discount: Math.min(safe, Math.round(i.price * i.quantity)) } : i
                    );
                    return { orders: { ...state.orders, [state.activeOrderId]: withTotals(order, newItems) } };
                });
            },

            setOrderDiscount: (discount) => {
                set((state) => {
                    const order = state.orders[state.activeOrderId];
                    if (!order) return state;
                    const clean = discount && Number.isFinite(discount.value) && discount.value > 0 ? discount : null;
                    return { orders: { ...state.orders, [state.activeOrderId]: withTotals(order, order.items, clean) } };
                });
            },

            clearActiveOrder: () => {
                set((state) => {
                    const order = state.orders[state.activeOrderId];
                    if (!order) return state;
                    return {
                        orders: {
                            ...state.orders,
                            [state.activeOrderId]: { ...order, items: [], orderDiscount: null, ...ZERO_TOTALS },
                        },
                    };
                });
            },
        }),
        { name: "oneiros-multi-cart", version: 2, migrate: (persisted) => persisted as CartStore }
    )
);
