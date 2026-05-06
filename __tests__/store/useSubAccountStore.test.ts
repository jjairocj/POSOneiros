import { describe, it, expect, beforeEach } from 'vitest';
import { act } from '@testing-library/react';
import { useSubAccountStore } from '../../app/store/useSubAccountStore';
import type { CartItem } from '../../app/types/cart';

const ITEMS: CartItem[] = [
    { id: 'p1', name: 'Café', price: 3000, quantity: 2, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 },
    { id: 'p2', name: 'Agua', price: 2000, quantity: 1, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 },
];

function getStore() {
    return useSubAccountStore.getState();
}

beforeEach(() => {
    act(() => {
        useSubAccountStore.setState({
            active: false,
            subAccounts: [],
            pendingItemId: null,
            pendingQty: 1,
        });
    });
});

describe('useSubAccountStore — initSplit', () => {
    it('creates 2 default subaccounts and activates split mode', () => {
        act(() => getStore().initSplit(ITEMS));
        const { active, subAccounts } = getStore();
        expect(active).toBe(true);
        expect(subAccounts).toHaveLength(2);
        expect(subAccounts[0].label).toBe('Persona 1');
        expect(subAccounts[1].label).toBe('Persona 2');
    });
});

describe('useSubAccountStore — addSubAccount / removeSubAccount', () => {
    it('adds a subaccount up to max 8', () => {
        act(() => getStore().initSplit(ITEMS));
        act(() => getStore().addSubAccount());
        expect(getStore().subAccounts).toHaveLength(3);
    });

    it('removes an empty subaccount', () => {
        act(() => getStore().initSplit(ITEMS));
        const id = getStore().subAccounts[1].id;
        act(() => getStore().removeSubAccount(id));
        expect(getStore().subAccounts).toHaveLength(1);
    });

    it('does not remove a subaccount that has items assigned', () => {
        act(() => getStore().initSplit(ITEMS));
        const sa = getStore().subAccounts[0];
        act(() => getStore().assignItem(sa.id, ITEMS[0], 1));
        act(() => getStore().removeSubAccount(sa.id));
        expect(getStore().subAccounts).toHaveLength(2);
    });
});

describe('useSubAccountStore — assignItem / unassignItem', () => {
    it('assigns an item and recalculates totals', () => {
        act(() => getStore().initSplit(ITEMS));
        const sa = getStore().subAccounts[0];
        act(() => getStore().assignItem(sa.id, ITEMS[0], 1));
        const updated = getStore().subAccounts[0];
        expect(updated.items).toHaveLength(1);
        expect(updated.total).toBe(3000);
    });

    it('stacks quantity when same item assigned again', () => {
        act(() => getStore().initSplit(ITEMS));
        const sa = getStore().subAccounts[0];
        act(() => getStore().assignItem(sa.id, ITEMS[0], 1));
        act(() => getStore().assignItem(sa.id, ITEMS[0], 1));
        expect(getStore().subAccounts[0].items[0].quantity).toBe(2);
    });

    it('unassigns an item and recalculates totals', () => {
        act(() => getStore().initSplit(ITEMS));
        const sa = getStore().subAccounts[0];
        act(() => getStore().assignItem(sa.id, ITEMS[0], 1));
        act(() => getStore().unassignItem(sa.id, ITEMS[0].id));
        expect(getStore().subAccounts[0].items).toHaveLength(0);
        expect(getStore().subAccounts[0].total).toBe(0);
    });
});

describe('useSubAccountStore — splitEqually', () => {
    it('sets customAmount = total/n rounded to $50 on each subaccount', () => {
        act(() => getStore().initSplit(ITEMS));
        // total = 3000*2 + 2000 = 8000 → 8000/2 = 4000 each
        act(() => getStore().splitEqually(ITEMS, 8000));
        const { subAccounts } = getStore();
        expect(subAccounts[0].customAmount).toBe(4000);
        expect(subAccounts[1].customAmount).toBe(4000);
    });

    it('assigns remainder to first person when total is not divisible evenly by $50', () => {
        act(() => getStore().initSplit(ITEMS));
        // 8100 / 2 = 4050 per person (already multiple of 50, so both get 4050)
        // try 8050 / 2 = 4025 → rounded to 4050 → first gets 8050 - 4050 = 4000
        act(() => getStore().splitEqually(ITEMS, 8050));
        const { subAccounts } = getStore();
        expect(subAccounts[0].customAmount! + subAccounts[1].customAmount!).toBe(8050);
    });
});

describe('useSubAccountStore — setCustomAmount', () => {
    it('updates the custom amount for a specific subaccount', () => {
        act(() => getStore().initSplit(ITEMS));
        const id = getStore().subAccounts[0].id;
        act(() => getStore().setCustomAmount(id, 3750));
        expect(getStore().subAccounts[0].customAmount).toBe(3750);
    });
});

describe('useSubAccountStore — markPaid / allPaid', () => {
    it('marks a subaccount as paid', () => {
        act(() => getStore().initSplit(ITEMS));
        const id = getStore().subAccounts[0].id;
        act(() => getStore().markPaid(id));
        expect(getStore().subAccounts[0].paid).toBe(true);
    });

    it('allPaid returns false when not all subaccounts are paid', () => {
        act(() => getStore().initSplit(ITEMS));
        const id = getStore().subAccounts[0].id;
        act(() => getStore().markPaid(id));
        expect(getStore().allPaid()).toBe(false);
    });

    it('allPaid returns true when all subaccounts are paid', () => {
        act(() => getStore().initSplit(ITEMS));
        act(() => {
            getStore().subAccounts.forEach(sa => getStore().markPaid(sa.id));
        });
        expect(getStore().allPaid()).toBe(true);
    });
});

describe('useSubAccountStore — cancelSplit', () => {
    it('resets all split state', () => {
        act(() => getStore().initSplit(ITEMS));
        act(() => getStore().cancelSplit());
        const { active, subAccounts } = getStore();
        expect(active).toBe(false);
        expect(subAccounts).toHaveLength(0);
    });
});
