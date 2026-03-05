import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../app/store/useCartStore';

describe('useCartStore Multi-Order Logic', () => {
    beforeEach(() => {
        // Reset the store before each test
        useCartStore.setState({
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
            activeOrderId: 'default'
        });
    });

    it('should add an item to the active order', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '1', name: 'Product A', price: 100 });

        const updatedStore = useCartStore.getState();
        const activeOrder = updatedStore.orders[updatedStore.activeOrderId];
        expect(activeOrder.items.length).toBe(1);
        expect(activeOrder.items[0].name).toBe('Product A');
        expect(activeOrder.subtotal).toBe(100);
    });

    it('should switch between orders independently', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '1', name: 'Product A', price: 100 });

        const newOrderId = store.addOrder('Mesa 2');
        useCartStore.getState().setActiveOrder(newOrderId);

        const currentStore = useCartStore.getState();
        expect(currentStore.activeOrderId).toBe(newOrderId);
        expect(currentStore.orders[newOrderId].items.length).toBe(0);

        currentStore.addItem({ id: '2', name: 'Product B', price: 200 });

        const finalStore = useCartStore.getState();
        expect(finalStore.orders[newOrderId].items.length).toBe(1);
        expect(finalStore.orders['default'].items.length).toBe(1);
        expect(finalStore.orders['default'].items[0].name).toBe('Product A');
    });

    it('should calculate taxes correctly', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '2', name: 'Product B', price: 1000 });

        const activeOrder = useCartStore.getState().orders['default'];
        expect(activeOrder.subtotal).toBe(1000);
        expect(activeOrder.tax).toBe(190); // 19%
        expect(activeOrder.total).toBe(1190);
    });
});
