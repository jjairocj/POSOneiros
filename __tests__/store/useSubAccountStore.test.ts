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
            orderItems: [],
            orderDiscount: null,
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

describe('useSubAccountStore — splitEqually leaves items empty', () => {
    it('does not duplicate the full order into every subaccount\'s items', () => {
        // Regression: splitEqually used to set every subaccount's `items` to
        // the entire order, so each person's card rendered as if they'd
        // ordered everything — and that duplicated list got persisted as
        // each SubAccount's items in the DB.
        act(() => getStore().initSplit(ITEMS));
        act(() => getStore().splitEqually(ITEMS, 8000));
        const { subAccounts } = getStore();
        expect(subAccounts[0].items).toEqual([]);
        expect(subAccounts[1].items).toEqual([]);
    });
});

describe('useSubAccountStore — order-level discount is prorated across item-based splits', () => {
    it('a fixed-amount order discount is shared, not applied in full to each subaccount', () => {
        // Order: Café x2 ($6000) + Agua x1 ($2000) = $8000, minus a $2000
        // fixed order discount → real total $6000. Split Café to Persona 1,
        // Agua to Persona 2. Before the fix, each subaccount computed its
        // total from calculateOrderTotals(sa.items) alone — with no idea an
        // order-level discount existed — so they'd sum to $8000, not $6000,
        // and the split could never reconcile with the real (discounted)
        // order total.
        act(() => getStore().initSplit(ITEMS, { type: 'amount', value: 2000 }));
        const [p1, p2] = getStore().subAccounts;
        act(() => getStore().assignItem(p1.id, ITEMS[0], 2)); // Café x2, $6000 of $8000 pre-discount
        act(() => getStore().assignItem(p2.id, ITEMS[1], 1)); // Agua x1, $2000 of $8000 pre-discount

        const { subAccounts } = getStore();
        const sum = subAccounts.reduce((a, sa) => a + sa.total, 0);
        expect(sum).toBe(6000); // exactly the discounted order total, not 8000
        // Discount prorated by each subaccount's share of the pre-discount base:
        // Persona 1 had 6000/8000 = 75% of the base → 75% of the $2000 discount ($1500)
        expect(subAccounts[0].total).toBe(4500); // 6000 - 1500
        expect(subAccounts[1].total).toBe(1500); // 2000 - 500
    });

    it('a percent order discount applies the same rate to every subaccount, summing exactly', () => {
        act(() => getStore().initSplit(ITEMS, { type: 'percent', value: 10 })); // 10% off $8000 → $7200
        const [p1, p2] = getStore().subAccounts;
        act(() => getStore().assignItem(p1.id, ITEMS[0], 2));
        act(() => getStore().assignItem(p2.id, ITEMS[1], 1));

        const { subAccounts } = getStore();
        const sum = subAccounts.reduce((a, sa) => a + sa.total, 0);
        expect(sum).toBe(7200);
        expect(subAccounts[0].total).toBe(5400); // 6000 - 10%
        expect(subAccounts[1].total).toBe(1800); // 2000 - 10%
    });

    it('splitting one line\'s quantity across many subaccounts still sums exactly (rounding remainder)', () => {
        // The "absurd" case: an item whose price doesn't divide evenly by
        // its own quantity, split across several people.
        const oddItem: CartItem = { id: 'p3', name: 'Torta', price: 10000, quantity: 3, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 };
        act(() => getStore().initSplit([oddItem], { type: 'amount', value: 1000 })); // $30000 - $1000 = $29000, not divisible by 3
        act(() => getStore().addSubAccount()); // 3 subaccounts total
        const [p1, p2, p3] = getStore().subAccounts;
        act(() => getStore().assignItem(p1.id, oddItem, 1));
        act(() => getStore().assignItem(p2.id, oddItem, 1));
        act(() => getStore().assignItem(p3.id, oddItem, 1));

        const { subAccounts } = getStore();
        const sum = subAccounts.reduce((a, sa) => a + sa.total, 0);
        expect(sum).toBe(29000); // no pesos lost or invented to rounding
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
