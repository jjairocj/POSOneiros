import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequireSession = vi.fn();
const mockRequireManager = vi.fn();
vi.mock('../../lib/auth', () => ({
    requireSession: () => mockRequireSession(),
    requireManager: () => mockRequireManager(),
    requirePermission: () => mockRequireManager(),
}));

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSaleDetailCount = vi.fn();
const mockTransaction = vi.fn();
const mockStockMovementFindMany = vi.fn();
const mockUserFindMany = vi.fn();
const mockFamilyUpsert = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        product: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
            update: (...a: any[]) => mockUpdate(...a),
            delete: (...a: any[]) => mockDelete(...a),
        },
        productFamily: { upsert: (...a: any[]) => mockFamilyUpsert(...a) },
        saleDetail: { count: (...a: any[]) => mockSaleDetailCount(...a) },
        stockMovement: { findMany: (...a: any[]) => mockStockMovementFindMany(...a) },
        user: { findMany: (...a: any[]) => mockUserFindMany(...a) },
        $transaction: (...a: any[]) => mockTransaction(...a),
    },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
    getProducts, createProduct, updateProduct, deleteProduct, toggleProductFavorite,
    adjustStock, getStockMovements,
} from '../../app/actions/product';

const makeProduct = (overrides = {}) => ({
    id: 'p1', name: 'Café', code: '001', price: 3000, cost: 0, stock: 10,
    taxIva: 0, taxIca: 0, taxImpoConsumo: 0, categoryId: null, imageUrl: null,
    isFavorite: false, isActive: true, description: null,
    createdAt: new Date(), updatedAt: new Date(), category: null,
    ...overrides,
});

function makeTx(overrides: Partial<Record<string, any>> = {}) {
    const tx = {
        ...overrides,
        product: {
            findUnique: vi.fn().mockResolvedValue({ stock: 10 }),
            update: vi.fn().mockResolvedValue({ stock: 10 }),
            ...overrides.product,
        },
        stockMovement: { create: vi.fn().mockResolvedValue({}), ...overrides.stockMovement },
    };
    mockTransaction.mockImplementation(async (fn: any) => fn(tx));
    return tx;
}

const productForm = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
};

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ id: 'u1', role: 'CASHIER' });
    mockRequireManager.mockResolvedValue({ id: 'mgr1', role: 'SUPERVISOR' });
});

describe('getProducts', () => {
    it('requires an authenticated session', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts();
        expect(mockRequireSession).toHaveBeenCalled();
    });

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

    it('"all" bypasses the category filter but keeps isActive:true by default', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts('all');
        const where = mockFindMany.mock.calls[0][0].where;
        expect(where.AND).toContainEqual({});
        expect(where.AND).toContainEqual({ isActive: true });
    });

    it('includeInactive drops the isActive filter entirely', async () => {
        mockFindMany.mockResolvedValue([]);
        await getProducts(undefined, undefined, { includeInactive: true });
        const where = mockFindMany.mock.calls[0][0].where;
        expect(where.AND[0]).toEqual({});
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

    it('serializes Date fields (product and category) to ISO strings', async () => {
        mockFindMany.mockResolvedValue([makeProduct({ category: { id: 'c1', name: 'Bebidas', createdAt: new Date(), updatedAt: new Date() } })]);
        const result = await getProducts();
        expect(typeof result[0].createdAt).toBe('string');
        expect(typeof result[0].category?.createdAt).toBe('string');
    });
});

describe('createProduct', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        const res = await createProduct(productForm({ name: 'Café', code: '001', price: '3000', cost: '0', stock: '10' }));
        expect(res).toEqual({ success: false, error: 'No tienes permisos para esta acción' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('creates a product from FormData', async () => {
        mockCreate.mockResolvedValue(makeProduct());
        const fd = productForm({ name: 'Café', code: '001', price: '3000', cost: '0', stock: '10' });
        await createProduct(fd);
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ name: 'Café', price: 3000 }),
        }));
    });

    it('rejects a missing name/code without hitting the database', async () => {
        expect(await createProduct(productForm({ code: '001' }))).toEqual({ success: false, error: 'El nombre es obligatorio.' });
        expect(await createProduct(productForm({ name: 'Café' }))).toEqual({ success: false, error: 'El código es obligatorio.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects a non-numeric price/cost/stock', async () => {
        const res = await createProduct(productForm({ name: 'Café', code: '001', price: 'abc' }));
        expect(res).toEqual({ success: false, error: 'Hay un valor numérico inválido.' });
    });

    it('rejects a negative price or cost', async () => {
        const res = await createProduct(productForm({ name: 'Café', code: '001', price: '-100' }));
        expect(res).toEqual({ success: false, error: 'Precio y costo no pueden ser negativos.' });
    });

    it('rejects a tax rate outside 0-100', async () => {
        const res = await createProduct(productForm({ name: 'Café', code: '001', price: '100', taxIva: '150' }));
        expect(res).toEqual({ success: false, error: 'Los impuestos son porcentajes entre 0 y 100.' });
    });

    it('treats categoryId "none" (or empty) as null', async () => {
        mockCreate.mockResolvedValue(makeProduct());
        await createProduct(productForm({ name: 'Café', code: '001', price: '100', categoryId: 'none' }));
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ categoryId: null }) }));
    });

    it('translates a duplicate-code DB error', async () => {
        mockCreate.mockRejectedValue(Object.assign(new Error('boom'), { code: 'P2002', meta: { target: ['code'] } }));
        const res = await createProduct(productForm({ name: 'Café', code: '001', price: '100' }));
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Ya existe un producto con ese código/);
    });

    it('leaves familyId null when no familyName was submitted', async () => {
        mockCreate.mockResolvedValue(makeProduct());
        await createProduct(productForm({ name: 'Buldak Carbonara', code: '002', price: '5000' }));
        expect(mockFamilyUpsert).not.toHaveBeenCalled();
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ familyId: null }) }));
    });

    it('upserts the family by name and uses its id, reusing an existing family instead of duplicating it', async () => {
        mockFamilyUpsert.mockResolvedValue({ id: 'fam-buldak', name: 'Buldak' });
        mockCreate.mockResolvedValue(makeProduct());
        await createProduct(productForm({ name: 'Buldak Carbonara', code: '002', price: '5000', familyName: 'Buldak' }));
        expect(mockFamilyUpsert).toHaveBeenCalledWith({
            where: { name: 'Buldak' }, update: {}, create: { name: 'Buldak' },
        });
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ familyId: 'fam-buldak' }) }));
    });
});

describe('updateProduct', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        const res = await updateProduct('p1', productForm({ name: 'Café', code: '001', price: '100' }));
        expect(res).toMatchObject({ success: false });
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('updates a product by id', async () => {
        const tx = makeTx({ product: { findUnique: vi.fn().mockResolvedValue({ stock: 5 }), update: vi.fn().mockResolvedValue({ stock: 5 }) } });
        const fd = productForm({ name: 'Café Updated', code: '001', price: '3500', cost: '0', stock: '5' });
        const res = await updateProduct('p1', fd);
        expect(res).toEqual({ success: true });
        expect(tx.product.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' } }));
    });

    it('logs a stock ADJUSTMENT movement when the edited stock differs from before', async () => {
        const tx = makeTx({ product: { findUnique: vi.fn().mockResolvedValue({ stock: 5 }), update: vi.fn().mockResolvedValue({ stock: 20 }) } });
        await updateProduct('p1', productForm({ name: 'Café', code: '001', price: '100', stock: '20' }));
        expect(tx.stockMovement.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ productId: 'p1', type: 'ADJUSTMENT', quantity: 15, stockAfter: 20, userId: 'mgr1' }),
        });
    });

    it('does not log a movement when stock is unchanged', async () => {
        const tx = makeTx({ product: { findUnique: vi.fn().mockResolvedValue({ stock: 5 }), update: vi.fn().mockResolvedValue({ stock: 5 }) } });
        await updateProduct('p1', productForm({ name: 'Café', code: '001', price: '100', stock: '5' }));
        expect(tx.stockMovement.create).not.toHaveBeenCalled();
    });

    it('rejects invalid form data before opening a transaction', async () => {
        const res = await updateProduct('p1', productForm({ code: '001' }));
        expect(res).toEqual({ success: false, error: 'El nombre es obligatorio.' });
        expect(mockTransaction).not.toHaveBeenCalled();
    });
});

describe('deleteProduct', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        expect(await deleteProduct('p1')).toMatchObject({ success: false });
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('hard-deletes a product with no sales history', async () => {
        mockSaleDetailCount.mockResolvedValue(0);
        mockDelete.mockResolvedValue({});
        const res = await deleteProduct('p1');
        expect(res).toEqual({ success: true });
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'p1' } });
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('soft-deletes (deactivates) a product that has sales, to keep history intact', async () => {
        mockSaleDetailCount.mockResolvedValue(3);
        mockUpdate.mockResolvedValue({});
        const res = await deleteProduct('p1');
        expect(res).toEqual({ success: true });
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isActive: false, isFavorite: false } });
        expect(mockDelete).not.toHaveBeenCalled();
    });
});

describe('toggleProductFavorite', () => {
    it('only requires an authenticated session, not a manager role', async () => {
        mockUpdate.mockResolvedValue({});
        const res = await toggleProductFavorite('p1', true);
        expect(res).toEqual({ success: true });
        expect(mockRequireSession).toHaveBeenCalled();
        expect(mockRequireManager).not.toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { isFavorite: true } });
    });

    it('rejects when not authenticated', async () => {
        mockRequireSession.mockRejectedValue(Object.assign(new Error('No autenticado'), { name: 'AuthError' }));
        expect(await toggleProductFavorite('p1', true)).toEqual({ success: false, error: 'No autenticado' });
    });
});

describe('adjustStock', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        const res = await adjustStock({ productId: 'p1', type: 'PURCHASE', quantity: 10 });
        expect(res).toMatchObject({ success: false });
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('rejects a zero quantity', async () => {
        expect(await adjustStock({ productId: 'p1', type: 'PURCHASE', quantity: 0 })).toEqual({ success: false, error: 'La cantidad debe ser distinta de cero.' });
    });

    it('rejects a negative PURCHASE quantity', async () => {
        expect(await adjustStock({ productId: 'p1', type: 'PURCHASE', quantity: -5 })).toEqual({ success: false, error: 'Una entrada no puede ser negativa.' });
    });

    it('rejects a negative WASTE quantity (must be entered as positive)', async () => {
        expect(await adjustStock({ productId: 'p1', type: 'WASTE', quantity: -5, reason: 'vencido' })).toEqual({ success: false, error: 'Indica la cantidad de merma en positivo.' });
    });

    it('requires a reason for WASTE and ADJUSTMENT but not PURCHASE', async () => {
        expect(await adjustStock({ productId: 'p1', type: 'WASTE', quantity: 5 })).toEqual({ success: false, error: 'Escribe el motivo.' });
        expect(await adjustStock({ productId: 'p1', type: 'ADJUSTMENT', quantity: 5 })).toEqual({ success: false, error: 'Escribe el motivo.' });
        makeTx();
        expect((await adjustStock({ productId: 'p1', type: 'PURCHASE', quantity: 5 })).success).toBe(true);
    });

    it('PURCHASE increments stock and optionally updates cost', async () => {
        const tx = makeTx({ product: { update: vi.fn().mockResolvedValue({ stock: 15 }) } });
        const res = await adjustStock({ productId: 'p1', type: 'PURCHASE', quantity: 5, unitCost: 900 });
        expect(res).toEqual({ success: true });
        expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { increment: 5 }, cost: 900 } });
        expect(tx.stockMovement.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ type: 'PURCHASE', quantity: 5, stockAfter: 15, unitCost: 900 }),
        });
    });

    it('WASTE decrements stock (stored as a negative movement) regardless of sign entered', async () => {
        const tx = makeTx({ product: { update: vi.fn().mockResolvedValue({ stock: 5 }) } });
        await adjustStock({ productId: 'p1', type: 'WASTE', quantity: 3, reason: 'vencido' });
        expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { increment: -3 } } });
        expect(tx.stockMovement.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ type: 'WASTE', quantity: -3, reason: 'vencido' }),
        });
    });

    it('ADJUSTMENT can move stock in either direction', async () => {
        const tx = makeTx({ product: { update: vi.fn().mockResolvedValue({ stock: 7 }) } });
        await adjustStock({ productId: 'p1', type: 'ADJUSTMENT', quantity: -2, reason: 'conteo físico' });
        expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { increment: -2 } } });
    });
});

describe('getStockMovements', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        expect(await getStockMovements()).toEqual([]);
        expect(mockStockMovementFindMany).not.toHaveBeenCalled();
    });

    it('returns rows joined with product info and the acting user name', async () => {
        mockStockMovementFindMany.mockResolvedValue([{
            id: 'm1', createdAt: new Date('2026-01-01'), type: 'SALE', quantity: -1, stockAfter: 9,
            unitCost: null, reason: null, saleId: 's1', productId: 'p1', userId: 'u1',
            product: { name: 'Café', code: '001' },
        }]);
        mockUserFindMany.mockResolvedValue([{ id: 'u1', name: 'Ana' }]);
        const rows = await getStockMovements();
        expect(rows).toEqual([expect.objectContaining({ productName: 'Café', productCode: '001', userName: 'Ana' })]);
    });

    it('caps "take" at 1000 and scopes by productId when given', async () => {
        mockStockMovementFindMany.mockResolvedValue([]);
        await getStockMovements({ productId: 'p1', take: 5000 });
        expect(mockStockMovementFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { productId: 'p1' }, take: 1000 }));
    });

    it('returns an empty array on a DB error instead of throwing', async () => {
        mockStockMovementFindMany.mockRejectedValue(new Error('down'));
        expect(await getStockMovements()).toEqual([]);
    });
});
