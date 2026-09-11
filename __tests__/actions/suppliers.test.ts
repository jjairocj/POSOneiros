import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRequirePermission = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        supplier: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
            update: (...a: any[]) => mockUpdate(...a),
        },
    },
}));
vi.mock('../../lib/auth', () => ({
    requirePermission: (...a: any[]) => mockRequirePermission(...a),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getSuppliers, createSupplier, updateSupplier, toggleSupplierActive } from '../../app/actions/suppliers';

const makeSupplier = (overrides: object = {}) => ({
    id: 'sup-1', name: 'Distribuidora Andina', taxId: '900123456-7', phone: '3000000000',
    email: 'a@b.com', address: 'Calle 1', notes: null, isActive: true,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
});

const formData = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
};

beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
});

describe('getSuppliers', () => {
    it('returns suppliers, active first, without requiring a session', async () => {
        mockFindMany.mockResolvedValue([makeSupplier()]);
        const result = await getSuppliers();
        expect(result).toEqual([expect.objectContaining({ id: 'sup-1', name: 'Distribuidora Andina', isActive: true })]);
        expect(mockRequirePermission).not.toHaveBeenCalled();
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        }));
    });

    it('returns an empty array on a DB error instead of throwing', async () => {
        mockFindMany.mockRejectedValue(new Error('db down'));
        const result = await getSuppliers();
        expect(result).toEqual([]);
    });
});

describe('createSupplier', () => {
    it('requires MANAGE_CATALOG', async () => {
        mockCreate.mockResolvedValue(makeSupplier());
        await createSupplier(formData({ name: 'ACME' }));
        expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_CATALOG');
    });

    it('rejects a blank name', async () => {
        const result = await createSupplier(formData({ name: '   ' }));
        expect(result.ok).toBe(false);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('trims optional fields down to null when blank', async () => {
        mockCreate.mockResolvedValue(makeSupplier());
        await createSupplier(formData({ name: 'ACME', taxId: '  ', phone: '', email: '' }));
        expect(mockCreate).toHaveBeenCalledWith({
            data: { name: 'ACME', taxId: null, phone: null, email: null, address: null, notes: null },
        });
    });

    it('keeps provided optional fields', async () => {
        mockCreate.mockResolvedValue(makeSupplier());
        await createSupplier(formData({ name: 'ACME', taxId: '900-1', phone: '3000000000', email: 'a@b.com', address: 'Cl 1', notes: 'Paga a 30 días' }));
        expect(mockCreate).toHaveBeenCalledWith({
            data: { name: 'ACME', taxId: '900-1', phone: '3000000000', email: 'a@b.com', address: 'Cl 1', notes: 'Paga a 30 días' },
        });
    });
});

describe('updateSupplier', () => {
    it('requires MANAGE_CATALOG and updates by id', async () => {
        mockUpdate.mockResolvedValue(makeSupplier());
        const result = await updateSupplier('sup-1', formData({ name: 'ACME Renamed' }));
        expect(result.ok).toBe(true);
        expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_CATALOG');
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'sup-1' } }));
    });

    it('rejects a blank name', async () => {
        const result = await updateSupplier('sup-1', formData({ name: '' }));
        expect(result.ok).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});

describe('toggleSupplierActive', () => {
    it('flips isActive and requires MANAGE_CATALOG', async () => {
        mockUpdate.mockResolvedValue(makeSupplier({ isActive: false }));
        const result = await toggleSupplierActive('sup-1', false);
        expect(result.ok).toBe(true);
        expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_CATALOG');
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'sup-1' }, data: { isActive: false } });
    });
});
