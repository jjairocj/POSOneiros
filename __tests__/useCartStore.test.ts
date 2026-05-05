import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from '../app/store/useCartStore';

const EMPTY_TOTALS = { subtotal: 0, taxIva: 0, taxIca: 0, taxImpoConsumo: 0, total: 0 };

describe('useCartStore Multi-Order Logic', () => {
    beforeEach(() => {
        useCartStore.setState({
            orders: {
                'default': {
                    id: 'default',
                    name: 'Orden Principal',
                    items: [],
                    ...EMPTY_TOTALS,
                    createdAt: Date.now()
                }
            },
            activeOrderId: 'default'
        });
    });

    it('should add an item to the active order', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '1', name: 'Product A', price: 100, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 });

        const activeOrder = useCartStore.getState().orders['default'];
        expect(activeOrder.items.length).toBe(1);
        expect(activeOrder.items[0].name).toBe('Product A');
        expect(activeOrder.subtotal).toBe(100);
    });

    it('should switch between orders independently', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '1', name: 'Product A', price: 100, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 });

        const newOrderId = store.addOrder('Mesa 2');
        useCartStore.getState().setActiveOrder(newOrderId);

        const currentStore = useCartStore.getState();
        expect(currentStore.activeOrderId).toBe(newOrderId);
        expect(currentStore.orders[newOrderId].items.length).toBe(0);

        currentStore.addItem({ id: '2', name: 'Product B', price: 200, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 });

        const finalStore = useCartStore.getState();
        expect(finalStore.orders[newOrderId].items.length).toBe(1);
        expect(finalStore.orders['default'].items.length).toBe(1);
        expect(finalStore.orders['default'].items[0].name).toBe('Product A');
    });

    it('should calculate IVA tax per product correctly', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '1', name: 'Product A', price: 1000, taxIva: 19, taxIca: 0, taxImpoConsumo: 0 });

        const activeOrder = useCartStore.getState().orders['default'];
        expect(activeOrder.subtotal).toBe(1000);
        expect(activeOrder.taxIva).toBeCloseTo(190);
        expect(activeOrder.taxIca).toBe(0);
        expect(activeOrder.taxImpoConsumo).toBe(0);
        expect(activeOrder.total).toBeCloseTo(1190);
    });

    it('should not add tax for products with 0% rates', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '2', name: 'Product B', price: 1000, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 });

        const activeOrder = useCartStore.getState().orders['default'];
        expect(activeOrder.taxIva).toBe(0);
        expect(activeOrder.taxIca).toBe(0);
        expect(activeOrder.taxImpoConsumo).toBe(0);
        expect(activeOrder.total).toBe(1000);
    });

    it('should accumulate multiple tax types correctly', () => {
        const store = useCartStore.getState();
        store.addItem({ id: '3', name: 'Product C', price: 1000, taxIva: 19, taxIca: 1, taxImpoConsumo: 8 });

        const activeOrder = useCartStore.getState().orders['default'];
        expect(activeOrder.taxIva).toBeCloseTo(190);
        expect(activeOrder.taxIca).toBeCloseTo(10);
        expect(activeOrder.taxImpoConsumo).toBeCloseTo(80);
        expect(activeOrder.total).toBeCloseTo(1280);
    });
});
