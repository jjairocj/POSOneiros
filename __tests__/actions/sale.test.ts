import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindUnique = vi.fn();
const mockFindMany = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        shift: { findUnique: (...a: any[]) => mockFindUnique(...a) },
        product: { findMany: (...a: any[]) => mockFindMany(...a) },
        $transaction: (...a: any[]) => mockTransaction(...a),
    },
}));

import { processSale } from '../../app/actions/sale';

const ITEMS = [{ id: 'p1', name: 'Café', price: 3000, quantity: 2 }];
const PAYMENTS = [{ method: 'CASH', amount: 6000 }];
const DB_PRODUCT = { id: 'p1', name: 'Café', price: 3000, stock: 10, taxIva: 0, taxIca: 0, taxImpoConsumo: 0 };

beforeEach(() => vi.clearAllMocks());

describe('processSale', () => {
    it('throws when shift is not found', async () => {
        mockFindUnique.mockResolvedValue(null);
        await expect(processSale('bad-shift', ITEMS, PAYMENTS)).rejects.toThrow('Turno inválido');
    });

    it('throws when shift is closed', async () => {
        mockFindUnique.mockResolvedValue({ id: 's1', status: 'CLOSED' });
        await expect(processSale('s1', ITEMS, PAYMENTS)).rejects.toThrow('Turno inválido');
    });

    it('throws when a product is missing', async () => {
        mockFindUnique.mockResolvedValue({ id: 's1', status: 'OPEN' });
        mockFindMany.mockResolvedValue([]); // no products found
        await expect(processSale('s1', ITEMS, PAYMENTS)).rejects.toThrow('Algunos productos ya no existen');
    });

    it('throws when stock is insufficient', async () => {
        mockFindUnique.mockResolvedValue({ id: 's1', status: 'OPEN' });
        mockFindMany.mockResolvedValue([{ ...DB_PRODUCT, stock: 1 }]); // only 1 in stock, need 2
        const txFn = vi.fn().mockImplementation(async (fn: any) => fn({
            product: { update: vi.fn() },
            sale: { create: vi.fn() },
            subAccount: { create: vi.fn() },
        }));
        mockTransaction.mockImplementation((fn: any) => txFn(fn));
        await expect(processSale('s1', ITEMS, PAYMENTS)).rejects.toThrow('Stock insuficiente');
    });

    it('creates a sale and returns it', async () => {
        mockFindUnique.mockResolvedValue({ id: 's1', status: 'OPEN' });
        mockFindMany.mockResolvedValue([DB_PRODUCT]);
        const fakeSale = { id: 'sale-1', details: [], payments: [] };
        mockTransaction.mockImplementation(async (fn: any) => fn({
            product: { update: vi.fn() },
            sale: { create: vi.fn().mockResolvedValue(fakeSale) },
            subAccount: { create: vi.fn() },
        }));
        const result = await processSale('s1', ITEMS, PAYMENTS);
        expect(result.id).toBe('sale-1');
    });

    it('creates a SubAccount record when subAccountLabel is provided', async () => {
        mockFindUnique.mockResolvedValue({ id: 's1', status: 'OPEN' });
        mockFindMany.mockResolvedValue([DB_PRODUCT]);
        const fakeSale = { id: 'sale-1', details: [], payments: [] };
        const mockSubAccountCreate = vi.fn();
        mockTransaction.mockImplementation(async (fn: any) => fn({
            product: { update: vi.fn() },
            sale: { create: vi.fn().mockResolvedValue(fakeSale) },
            subAccount: { create: mockSubAccountCreate },
        }));
        await processSale('s1', ITEMS, PAYMENTS, undefined, 'Persona 1');
        expect(mockSubAccountCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ label: 'Persona 1', paid: true, saleId: 'sale-1' }),
        }));
    });
});
