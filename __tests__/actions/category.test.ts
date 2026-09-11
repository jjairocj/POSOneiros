import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockTransaction = vi.fn();
const mockRequireManager = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        category: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
            update: (...a: any[]) => mockUpdate(...a),
            delete: (...a: any[]) => mockDelete(...a),
        },
        $transaction: (...a: any[]) => mockTransaction(...a),
    },
}));
vi.mock('../../lib/auth', () => ({
    requireSession: vi.fn(),
    requireManager: () => mockRequireManager(),
    requirePermission: () => mockRequireManager(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
    getCategories, createCategory, updateCategory, deleteCategory, updateCategoryOrders,
} from '../../app/actions/category';

const makeCategory = (overrides: object = {}) => ({
    id: 'cat-1', name: 'Bebidas', sortOrder: 0,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    _count: { products: 3 },
    ...overrides,
});

const formData = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
};

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireManager.mockResolvedValue({ id: 'u1', role: 'SUPERVISOR' });
});

describe('getCategories', () => {
    it('returns categories with serialized dates and the product count', async () => {
        mockFindMany.mockResolvedValue([makeCategory()]);
        const result = await getCategories();
        expect(result).toEqual([expect.objectContaining({
            id: 'cat-1', name: 'Bebidas',
            createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
            _count: { products: 3 },
        })]);
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            include: { _count: { select: { products: true } } },
        }));
    });

    it('does not require a session (public catalog read) and fails soft on a DB error', async () => {
        mockFindMany.mockRejectedValue(new Error('DB down'));
        expect(await getCategories()).toEqual([]);
        expect(mockRequireManager).not.toHaveBeenCalled();
    });
});

describe('createCategory', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        const res = await createCategory(formData({ name: 'Snacks' }));
        expect(res).toEqual({ success: false, error: 'No tienes permisos para esta acción' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects an empty name without hitting the database', async () => {
        const res = await createCategory(formData({ name: '   ' }));
        expect(res).toEqual({ success: false, error: 'El nombre es obligatorio.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('trims the name and defaults sortOrder to 0', async () => {
        mockCreate.mockResolvedValue(makeCategory());
        const res = await createCategory(formData({ name: '  Snacks  ' }));
        expect(res).toEqual({ success: true });
        expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Snacks', sortOrder: 0 } });
    });

    it('parses a provided sortOrder', async () => {
        mockCreate.mockResolvedValue(makeCategory());
        await createCategory(formData({ name: 'Snacks', sortOrder: '5' }));
        expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Snacks', sortOrder: 5 } });
    });

    it('translates a DB error via toUserMessage instead of leaking it raw', async () => {
        mockCreate.mockRejectedValue(Object.assign(new Error('boom'), { code: 'P2002', meta: { target: ['name'] } }));
        const res = await createCategory(formData({ name: 'Snacks' }));
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Ya existe/);
    });
});

describe('updateCategory', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        expect(await updateCategory('cat-1', formData({ name: 'X' }))).toMatchObject({ success: false });
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('rejects an empty name', async () => {
        expect(await updateCategory('cat-1', formData({ name: '' }))).toEqual({ success: false, error: 'El nombre es obligatorio.' });
    });

    it('updates name and sortOrder by id', async () => {
        mockUpdate.mockResolvedValue(makeCategory());
        const res = await updateCategory('cat-1', formData({ name: 'Bebidas frías', sortOrder: '2' }));
        expect(res).toEqual({ success: true });
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'cat-1' }, data: { name: 'Bebidas frías', sortOrder: 2 } });
    });
});

describe('deleteCategory', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        expect(await deleteCategory('cat-1')).toMatchObject({ success: false });
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes by id when there are no linked products', async () => {
        mockDelete.mockResolvedValue(makeCategory());
        expect(await deleteCategory('cat-1')).toEqual({ success: true });
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });

    it('gives a friendly message when products still reference the category (FK violation)', async () => {
        mockDelete.mockRejectedValue(Object.assign(new Error('FK'), { code: 'P2003' }));
        const res = await deleteCategory('cat-1');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/registros relacionados|contiene productos/);
    });
});

describe('updateCategoryOrders', () => {
    it('requires SUPERVISOR or higher', async () => {
        mockRequireManager.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        expect(await updateCategoryOrders([{ id: 'a', sortOrder: 0 }])).toMatchObject({ success: false });
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('updates every category atomically in one transaction', async () => {
        mockTransaction.mockResolvedValue([]);
        const updates = [{ id: 'a', sortOrder: 0 }, { id: 'b', sortOrder: 1 }];
        const res = await updateCategoryOrders(updates);
        expect(res).toEqual({ success: true });
        expect(mockTransaction).toHaveBeenCalledTimes(1);
        const passedArray = mockTransaction.mock.calls[0][0];
        expect(passedArray).toHaveLength(2);
    });

    it('reports a friendly error if the reorder transaction fails', async () => {
        mockTransaction.mockRejectedValue(new Error('boom'));
        const res = await updateCategoryOrders([{ id: 'a', sortOrder: 0 }]);
        expect(res).toEqual({ success: false, error: 'Error al reordenar las categorías.' });
    });
});
