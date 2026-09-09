import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockShiftFindUnique = vi.fn();
const mockConfigFindUnique = vi.fn();
const mockTransaction = vi.fn();
const mockRequireSession = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        shift: { findUnique: (...a: any[]) => mockShiftFindUnique(...a) },
        systemConfig: { findUnique: (...a: any[]) => mockConfigFindUnique(...a) },
        $transaction: (...a: any[]) => mockTransaction(...a),
    },
}));
vi.mock('../../lib/auth', () => ({
    requireSession: (...a: any[]) => mockRequireSession(...a),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { processSale, cancelSale } from '../../app/actions/sale';

const ITEMS = [{ id: 'p1', quantity: 2 }];
const PAYMENTS = [{ method: 'CASH' as const, amount: 6000 }];
const DB_PRODUCT = { id: 'p1', name: 'Café', code: 'C1', price: 3000, stock: 10, isActive: true, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 };
const OPEN_SHIFT = { id: 's1', status: 'OPEN', userId: 'u1', registerId: 'r1', register: { id: 'r1', prefix: 'POS' } };

function makeTx(overrides: Partial<Record<string, any>> = {}) {
    const tx = {
        product: {
            findMany: vi.fn().mockResolvedValue([DB_PRODUCT]),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            update: vi.fn().mockResolvedValue({}),
        },
        register: { update: vi.fn().mockResolvedValue({ nextNumber: 8 }) },
        sale: {
            create: vi.fn().mockImplementation(async ({ data }: any) => ({ id: 'sale-1', ...data, details: [], payments: data.payments.create })),
            findUnique: vi.fn(),
            update: vi.fn().mockResolvedValue({}),
        },
        payment: { updateMany: vi.fn().mockResolvedValue({}) },
        subAccount: { createMany: vi.fn().mockResolvedValue({}) },
        stockMovement: { createMany: vi.fn().mockResolvedValue({}), create: vi.fn().mockResolvedValue({}) },
        ...overrides,
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(tx));
    return tx;
}

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ id: 'u1', role: 'CASHIER' });
    mockConfigFindUnique.mockResolvedValue({ value: 'false' });
    mockShiftFindUnique.mockResolvedValue(OPEN_SHIFT);
});

describe('processSale — validation', () => {
    it('fails when not authenticated', async () => {
        mockRequireSession.mockRejectedValue(Object.assign(new Error('No autenticado'), { name: 'AuthError' }));
        const res = await processSale('s1', ITEMS, PAYMENTS);
        expect(res).toEqual({ ok: false, error: 'No autenticado' });
    });

    it('fails when the cart is empty', async () => {
        const res = await processSale('s1', [], PAYMENTS);
        expect(res.ok).toBe(false);
    });

    it('rejects quantities <= 0', async () => {
        const res = await processSale('s1', [{ id: 'p1', quantity: -1 }], PAYMENTS);
        expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/mayores a cero/) });
    });

    it('rejects unknown payment methods and non-positive amounts', async () => {
        expect((await processSale('s1', ITEMS, [{ method: 'BITCOIN' as any, amount: 1 }])).ok).toBe(false);
        expect((await processSale('s1', ITEMS, [{ method: 'CASH', amount: 0 }])).ok).toBe(false);
    });

    it('fails when shift is not found or closed', async () => {
        mockShiftFindUnique.mockResolvedValue(null);
        expect(await processSale('bad', ITEMS, PAYMENTS)).toMatchObject({ ok: false, error: expect.stringMatching(/turno/i) });
        mockShiftFindUnique.mockResolvedValue({ ...OPEN_SHIFT, status: 'CLOSED' });
        expect(await processSale('s1', ITEMS, PAYMENTS)).toMatchObject({ ok: false });
    });

    it('fails when the shift belongs to another cashier', async () => {
        mockRequireSession.mockResolvedValue({ id: 'u2', role: 'CASHIER' });
        makeTx();
        expect(await processSale('s1', ITEMS, PAYMENTS)).toMatchObject({ ok: false, error: expect.stringMatching(/otro usuario/) });
    });

    it('fails when a product is missing', async () => {
        makeTx({ product: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() } });
        expect(await processSale('s1', ITEMS, PAYMENTS)).toMatchObject({ ok: false, error: expect.stringMatching(/ya no existen/) });
    });

    it('fails when a product is inactive', async () => {
        makeTx({ product: { findMany: vi.fn().mockResolvedValue([{ ...DB_PRODUCT, isActive: false }]), updateMany: vi.fn() } });
        expect(await processSale('s1', ITEMS, PAYMENTS)).toMatchObject({ ok: false, error: expect.stringMatching(/desactivado/) });
    });
});

describe('processSale — stock', () => {
    it('decrements stock atomically with a stock >= quantity guard and writes a SALE movement', async () => {
        const tx = makeTx();
        tx.product.findMany.mockResolvedValueOnce([DB_PRODUCT]).mockResolvedValueOnce([{ id: 'p1', stock: 8 }]);
        await processSale('s1', ITEMS, PAYMENTS);
        expect(tx.stockMovement.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ productId: 'p1', type: 'SALE', quantity: -2, stockAfter: 8, saleId: 'sale-1' })] });
        expect(tx.product.updateMany).toHaveBeenCalledWith({
            where: { id: 'p1', stock: { gte: 2 } },
            data: { stock: { decrement: 2 } },
        });
    });

    it('fails with "Stock insuficiente" when the guarded update matches nothing (race-safe)', async () => {
        makeTx({ product: { findMany: vi.fn().mockResolvedValue([{ ...DB_PRODUCT, stock: 1 }]), updateMany: vi.fn().mockResolvedValue({ count: 0 }) } });
        expect(await processSale('s1', ITEMS, PAYMENTS)).toMatchObject({ ok: false, error: expect.stringMatching(/Stock insuficiente/) });
    });

    it('skips the stock guard when allowNegativeStock is enabled', async () => {
        mockConfigFindUnique.mockResolvedValue({ value: 'true' });
        const tx = makeTx();
        await processSale('s1', ITEMS, PAYMENTS);
        expect(tx.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' } }));
    });

    it('merges duplicated lines for the same product', async () => {
        const tx = makeTx();
        await processSale('s1', [{ id: 'p1', quantity: 1 }, { id: 'p1', quantity: 1 }], PAYMENTS);
        expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
        expect(tx.product.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { stock: { decrement: 2 } } }));
    });
});

describe('processSale — totals and payments', () => {
    it('computes taxes from DB prices and requires payments to match the total', async () => {
        makeTx({ product: { findMany: vi.fn().mockResolvedValue([{ ...DB_PRODUCT, price: 10000, taxIva: 19 }]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) } });
        const bad = await processSale('s1', [{ id: 'p1', quantity: 1 }], [{ method: 'CASH', amount: 10000 }]);
        expect(bad).toMatchObject({ ok: false, error: expect.stringMatching(/no coinciden/) });

        makeTx({ product: { findMany: vi.fn().mockResolvedValue([{ ...DB_PRODUCT, price: 10000, taxIva: 19 }]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) } });
        const good = await processSale('s1', [{ id: 'p1', quantity: 1 }], [{ method: 'CASH', amount: 11900 }]);
        expect(good.ok).toBe(true);
    });

    it('assigns a consecutive number from the register and snapshots product name/code', async () => {
        const tx = makeTx();
        const res = await processSale('s1', ITEMS, PAYMENTS);
        expect(res.ok).toBe(true);
        expect(tx.register.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1' }, data: { nextNumber: { increment: 1 } } }));
        const data = tx.sale.create.mock.calls[0][0].data;
        expect(data.number).toBe(7);
        expect(data.total).toBe(6000);
        expect(data.details.create[0]).toMatchObject({ productName: 'Café', productCode: 'C1', quantity: 2, unitPrice: 3000 });
    });

    it('creates one SubAccount per payer linked to a single sale (split bill)', async () => {
        const tx = makeTx();
        const res = await processSale('s1', ITEMS,
            [{ method: 'CASH', amount: 3000, subAccountLabel: 'Ana' }, { method: 'CARD', amount: 3000, subAccountLabel: 'Luis' }],
            { subAccounts: [{ label: 'Ana', items: [], amount: 3000 }, { label: 'Luis', items: [], amount: 3000 }] });
        expect(res.ok).toBe(true);
        expect(tx.sale.create).toHaveBeenCalledTimes(1);
        expect(tx.product.updateMany).toHaveBeenCalledTimes(1);
        expect(tx.subAccount.createMany).toHaveBeenCalledWith({
            data: [
                expect.objectContaining({ label: 'Ana', total: 3000, paid: true, saleId: 'sale-1' }),
                expect.objectContaining({ label: 'Luis', total: 3000, paid: true, saleId: 'sale-1' }),
            ],
        });
    });

    it('still supports the legacy single subAccountLabel', async () => {
        const tx = makeTx();
        await processSale('s1', ITEMS, PAYMENTS, { subAccountLabel: 'Persona 1' });
        expect(tx.subAccount.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ label: 'Persona 1', total: 6000 })] });
    });
});

describe('cancelSale', () => {
    it('requires ADMIN', async () => {
        mockRequireSession.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        expect(await cancelSale('sale-1', 'error de digitación')).toMatchObject({ ok: false, error: expect.stringMatching(/permisos/) });
        expect(mockRequireSession).toHaveBeenCalledWith('ADMIN');
    });

    it('requires a reason', async () => {
        mockRequireSession.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
        expect(await cancelSale('sale-1', ' ')).toMatchObject({ ok: false, error: expect.stringMatching(/motivo/) });
    });

    it('restores stock and marks the sale CANCELLED', async () => {
        mockRequireSession.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
        const tx = makeTx();
        tx.sale.findUnique.mockResolvedValue({ id: 'sale-1', status: 'COMPLETED', details: [{ productId: 'p1', quantity: 2 }] });
        tx.product.update.mockResolvedValue({ stock: 12 });
        const res = await cancelSale('sale-1', 'cliente se arrepintió');
        expect(res.ok).toBe(true);
        expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { increment: 2 } } });
        expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'CANCEL', quantity: 2, stockAfter: 12, saleId: 'sale-1' }) });
        expect(tx.sale.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ status: 'CANCELLED', cancelledById: 'admin', cancelReason: 'cliente se arrepintió' }),
        }));
    });

    it('refuses to cancel twice', async () => {
        mockRequireSession.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
        const tx = makeTx();
        tx.sale.findUnique.mockResolvedValue({ id: 'sale-1', status: 'CANCELLED', details: [] });
        expect(await cancelSale('sale-1', 'otra vez')).toMatchObject({ ok: false, error: expect.stringMatching(/ya fue anulada/) });
    });
});
