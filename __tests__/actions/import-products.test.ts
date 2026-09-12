import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProductFindMany = vi.fn();
const mockProductFindUnique = vi.fn();
const mockProductUpsert = vi.fn();
const mockStockMovementCreate = vi.fn();
const mockRequireAdmin = vi.fn();

vi.mock('@/lib/prisma', () => ({
    default: {
        product: {
            findMany: (...a: any[]) => mockProductFindMany(...a),
            findUnique: (...a: any[]) => mockProductFindUnique(...a),
            upsert: (...a: any[]) => mockProductUpsert(...a),
        },
        stockMovement: { create: (...a: any[]) => mockStockMovementCreate(...a) },
    },
}));
vi.mock('@/lib/auth', () => ({ requireAdmin: (...a: any[]) => mockRequireAdmin(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { previewImport, importProducts } from '../../app/actions/import-products';

const row = (overrides: object = {}) => ({
    code: 'C1', name: 'Café', price: 3000, taxIva: 0, stock: 10, isActive: true,
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
});

describe('previewImport', () => {
    it('requires ADMIN', async () => {
        mockProductFindMany.mockResolvedValue([]);
        await previewImport([row()]);
        expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('marks a code with no existing product as "new"', async () => {
        mockProductFindMany.mockResolvedValue([]);
        const result = await previewImport([row({ code: 'NEW1' })]);
        expect(result[0]).toEqual(expect.objectContaining({ status: 'new' }));
        expect(result[0].existingId).toBeUndefined();
    });

    it('marks an identical existing product as "unchanged"', async () => {
        mockProductFindMany.mockResolvedValue([{ id: 'p1', code: 'C1', name: 'Café', price: 3000, taxIva: 0, stock: 10, isActive: true }]);
        const result = await previewImport([row()]);
        expect(result[0].status).toBe('unchanged');
        expect(result[0].existingId).toBe('p1');
    });

    it('marks an existing product with any changed field as "update"', async () => {
        mockProductFindMany.mockResolvedValue([{ id: 'p1', code: 'C1', name: 'Café', price: 3500, taxIva: 0, stock: 10, isActive: true }]);
        const result = await previewImport([row({ price: 3000 })]);
        expect(result[0].status).toBe('update');
        expect(result[0].existingId).toBe('p1');
    });
});

describe('importProducts', () => {
    it('requires ADMIN', async () => {
        mockProductFindMany.mockResolvedValue([]);
        await importProducts([]);
        expect(mockRequireAdmin).toHaveBeenCalled();
    });

    it('creates a brand-new product and logs an IMPORT stock movement for its initial stock', async () => {
        mockProductFindMany.mockResolvedValue([]);
        mockProductUpsert.mockResolvedValue({ id: 'p1', stock: 10 });
        const result = await importProducts([row({ code: 'NEW1' })]);
        expect(result.created).toBe(1);
        expect(result.updated).toBe(0);
        expect(mockProductUpsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { code: 'NEW1' },
            create: expect.objectContaining({ code: 'NEW1', cost: 0, taxIca: 0, taxImpoConsumo: 0 }),
        }));
        expect(mockStockMovementCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ productId: 'p1', type: 'IMPORT', quantity: 10, stockAfter: 10, userId: 'admin1' }),
        });
    });

    it('skips unchanged rows entirely — no upsert, no stock movement', async () => {
        mockProductFindMany.mockResolvedValue([{ id: 'p1', code: 'C1', name: 'Café', price: 3000, taxIva: 0, stock: 10, isActive: true }]);
        const result = await importProducts([row()]);
        expect(result.unchanged).toBe(1);
        expect(mockProductUpsert).not.toHaveBeenCalled();
        expect(mockStockMovementCreate).not.toHaveBeenCalled();
    });

    it('updates a changed row and logs the stock delta against the prior stock', async () => {
        mockProductFindMany.mockResolvedValue([{ id: 'p1', code: 'C1', name: 'Café', price: 3500, taxIva: 0, stock: 8, isActive: true }]);
        mockProductFindUnique.mockResolvedValue({ stock: 8 });
        mockProductUpsert.mockResolvedValue({ id: 'p1', stock: 10 });
        const result = await importProducts([row({ price: 3000, stock: 10 })]);
        expect(result.updated).toBe(1);
        expect(mockStockMovementCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({ quantity: 2, stockAfter: 10 }),
        });
    });

    it('does not log a stock movement when the update leaves stock unchanged', async () => {
        mockProductFindMany.mockResolvedValue([{ id: 'p1', code: 'C1', name: 'Café', price: 3500, taxIva: 0, stock: 10, isActive: true }]);
        mockProductFindUnique.mockResolvedValue({ stock: 10 });
        mockProductUpsert.mockResolvedValue({ id: 'p1', stock: 10 });
        await importProducts([row({ price: 3000, stock: 10 })]);
        expect(mockStockMovementCreate).not.toHaveBeenCalled();
    });

    it('collects a per-row error and keeps processing the rest instead of aborting', async () => {
        mockProductFindMany.mockResolvedValue([]);
        mockProductUpsert
            .mockRejectedValueOnce(new Error('duplicate code'))
            .mockResolvedValueOnce({ id: 'p2', stock: 5 });
        const result = await importProducts([row({ code: 'BAD' }), row({ code: 'OK1' })]);
        expect(result.errors).toEqual(['BAD: duplicate code']);
        expect(result.created).toBe(1);
    });
});
