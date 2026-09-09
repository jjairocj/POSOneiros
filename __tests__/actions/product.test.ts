vi.mock('../../lib/auth', () => ({ requireSession: vi.fn().mockResolvedValue({ id: 'u1', role: 'ADMIN' }), requireAdmin: vi.fn().mockResolvedValue({ id: 'u1', role: 'ADMIN' }) }));
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        product: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
            update: (...a: any[]) => mockUpdate(...a),
            delete: (...a: any[]) => mockDelete(...a),
        },
        saleDetail: { count: vi.fn().mockResolvedValue(0) },
        stockMovement: { create: vi.fn() },
        $transaction: async (fn: any) => fn({
            product: {
                findUnique: vi.fn().mockResolvedValue({ stock: 10 }),
                update: (...a: any[]) => { mockUpdate(...a); return Promise.resolve({ stock: 10 }); },
            },
            stockMovement: { create: vi.fn() },
        }),
    },
}));

const makeProduct = (overrides = {}) => ({
    id: 'p1', name: 'Café', code: '001', price: 3000, cost: 0, stock: 10,
    taxIva: 0, taxIca: 0, taxImpoConsumo: 0, categoryId: null, imageUrl: null,
    isFavorite: false, isActive: true, description: null,
    createdAt: new Date(), updatedAt: new Date(), category: null,
    ...overrides,
});

import { getProducts, createProduct, updateProduct, deleteProduct } from '../../app/actions/product';

beforeEach(() => vi.clearAllMocks());

describe('getProducts', () => {
    it('returns all products when no filter', async () => {
        mockFindMany.mockResolvedValue([makeProduct()]);
        const result = await getProducts();
        expect(result).toHaveLength(1);
    });

    it('filters by favorites', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts('favorites');
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ AND: expect.arrayContaining([{ isFavorite: true }]) }),
        }));
    });

    it('filters uncategorized products', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts('uncategorized');
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ AND: expect.arrayContaining([{ categoryId: null }]) }),
        }));
    });

    it('filters by categoryId', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts('cat-bebidas');
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ AND: expect.arrayContaining([{ categoryId: 'cat-bebidas' }]) }),
        }));
    });

    it('applies search filter', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts(undefined, 'coca');
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({
                AND: expect.arrayContaining([{ OR: expect.any(Array) }]),
            }),
        }));
    });

    it('returns empty array on error', async () => {
        mockFindMany.mockRejectedValue(new Error('DB error'));
        const result = await getProducts();
        expect(result).toEqual([]);
    });

    it('serializes Date fields to ISO strings', async () => {
        mockFindMany.mockResolvedValue([makeProduct()]);
        const result = await getProducts();
        expect(typeof result[0].createdAt).toBe('string');
    });
});

describe('createProduct', () => {
    it('creates a product from FormData', async () => {
        mockCreate.mockResolvedValue(makeProduct());
        const fd = new FormData();
        fd.append('name', 'Café'); fd.append('code', '001'); fd.append('price', '3000');
        fd.append('cost', '0'); fd.append('stock', '10');
        await createProduct(fd);
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'Café', price: 3000 }),
        }));
    });
});

describe('updateProduct', () => {
    it('updates a product by id', async () => {
        mockUpdate.mockResolvedValue(makeProduct());
        const fd = new FormData();
        fd.append('name', 'Café Updated'); fd.append('code', '001'); fd.append('price', '3500');
        fd.append('cost', '0'); fd.append('stock', '5');
        await updateProduct('p1', fd);
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'p1' },
        }));
    });
});

describe('deleteProduct', () => {
    it('deletes a product by id', async () => {
        mockDelete.mockResolvedValue({});
        await deleteProduct('p1');
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });
});
