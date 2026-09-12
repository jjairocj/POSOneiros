import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockUpdate = vi.fn();
const mockRequireAdmin = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: { role: { findMany: (...a: any[]) => mockFindMany(...a), update: (...a: any[]) => mockUpdate(...a) } },
}));
vi.mock('../../lib/auth', () => ({
    requireAdmin: (...a: any[]) => mockRequireAdmin(...a),
    PERMISSION_KEYS: ["VIEW_DASHBOARD", "MANAGE_CATALOG", "RECEIVE_INVENTORY", "VIEW_REPORTS", "VOID_SALE"],
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getRolePermissions, updateRolePermissions } from '../../app/actions/roles';

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
});

describe('getRolePermissions', () => {
    it('requires ADMIN and returns SUPERVISOR/CASHIER rows in that order', async () => {
        mockFindMany.mockResolvedValue([
            { name: 'CASHIER', permissions: ['VIEW_DASHBOARD'] },
            { name: 'SUPERVISOR', permissions: ['MANAGE_CATALOG', 'VIEW_REPORTS'] },
        ]);
        const result = await getRolePermissions();
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(result).toEqual([
            { role: 'SUPERVISOR', permissions: ['MANAGE_CATALOG', 'VIEW_REPORTS'] },
            { role: 'CASHIER', permissions: ['VIEW_DASHBOARD'] },
        ]);
    });

    it('drops unknown permission strings from the DB', async () => {
        mockFindMany.mockResolvedValue([
            { name: 'SUPERVISOR', permissions: ['MANAGE_CATALOG', 'SOME_REMOVED_PERM'] },
            { name: 'CASHIER', permissions: [] },
        ]);
        const result = await getRolePermissions();
        expect(result[0].permissions).toEqual(['MANAGE_CATALOG']);
    });

    it('defaults a missing role row to an empty permission list', async () => {
        mockFindMany.mockResolvedValue([{ name: 'SUPERVISOR', permissions: ['VIEW_REPORTS'] }]);
        const result = await getRolePermissions();
        expect(result).toEqual([
            { role: 'SUPERVISOR', permissions: ['VIEW_REPORTS'] },
            { role: 'CASHIER', permissions: [] },
        ]);
    });

    it('returns empty permission rows instead of throwing on a DB error', async () => {
        mockFindMany.mockRejectedValue(new Error('db down'));
        const result = await getRolePermissions();
        expect(result).toEqual([
            { role: 'SUPERVISOR', permissions: [] },
            { role: 'CASHIER', permissions: [] },
        ]);
    });

    it('returns empty permission rows if requireAdmin rejects', async () => {
        mockRequireAdmin.mockRejectedValue(new Error('not admin'));
        const result = await getRolePermissions();
        expect(result).toEqual([
            { role: 'SUPERVISOR', permissions: [] },
            { role: 'CASHIER', permissions: [] },
        ]);
    });
});

describe('updateRolePermissions', () => {
    it('requires ADMIN and overwrites the role\'s permissions', async () => {
        mockUpdate.mockResolvedValue({});
        const result = await updateRolePermissions('CASHIER', ['RECEIVE_INVENTORY']);
        expect(result.ok).toBe(true);
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(mockUpdate).toHaveBeenCalledWith({ where: { name: 'CASHIER' }, data: { permissions: ['RECEIVE_INVENTORY'] } });
    });

    it('dedupes and drops unknown permission keys before saving', async () => {
        mockUpdate.mockResolvedValue({});
        await updateRolePermissions('SUPERVISOR', ['VIEW_REPORTS', 'VIEW_REPORTS', 'NOT_REAL' as any]);
        expect(mockUpdate).toHaveBeenCalledWith({ where: { name: 'SUPERVISOR' }, data: { permissions: ['VIEW_REPORTS'] } });
    });

    it('rejects a role outside SUPERVISOR/CASHIER', async () => {
        const result = await updateRolePermissions('ADMIN' as any, ['VIEW_REPORTS']);
        expect(result.ok).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('fails gracefully when requireAdmin rejects', async () => {
        mockRequireAdmin.mockRejectedValue(new Error('not admin'));
        const result = await updateRolePermissions('CASHIER', []);
        expect(result.ok).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('fails gracefully when the update throws', async () => {
        mockUpdate.mockRejectedValue(new Error('db down'));
        const result = await updateRolePermissions('CASHIER', []);
        expect(result.ok).toBe(false);
    });
});
