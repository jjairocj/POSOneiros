import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
const mockRoleFindUnique = vi.fn();
vi.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => mockGetServerSession(...a) }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ default: { role: { findUnique: (...a: unknown[]) => mockRoleFindUnique(...a) } } }));

import { requireSession, requireAdmin, requireManager, requirePermission, roleAtLeast, AuthError } from '../../lib/auth';

const session = (role: string) => ({ user: { id: 'u1', name: 'Ana', email: 'a@x.com', role } });

beforeEach(() => vi.clearAllMocks());

describe('roleAtLeast', () => {
    it('ranks CASHIER < SUPERVISOR < ADMIN', () => {
        expect(roleAtLeast('CASHIER', 'CASHIER')).toBe(true);
        expect(roleAtLeast('CASHIER', 'SUPERVISOR')).toBe(false);
        expect(roleAtLeast('SUPERVISOR', 'CASHIER')).toBe(true);
        expect(roleAtLeast('SUPERVISOR', 'SUPERVISOR')).toBe(true);
        expect(roleAtLeast('SUPERVISOR', 'ADMIN')).toBe(false);
        expect(roleAtLeast('ADMIN', 'SUPERVISOR')).toBe(true);
        expect(roleAtLeast('ADMIN', 'ADMIN')).toBe(true);
    });
});

describe('requireSession', () => {
    it('throws AuthError when there is no session', async () => {
        mockGetServerSession.mockResolvedValue(null);
        await expect(requireSession()).rejects.toBeInstanceOf(AuthError);
    });

    it('lets any authenticated role through with no minimum', async () => {
        mockGetServerSession.mockResolvedValue(session('CASHIER'));
        await expect(requireSession()).resolves.toMatchObject({ role: 'CASHIER' });
    });

    it('defaults to CASHIER when the token carries no role', async () => {
        mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } });
        await expect(requireSession()).resolves.toMatchObject({ role: 'CASHIER' });
    });

    it('rejects a CASHIER against a SUPERVISOR minimum', async () => {
        mockGetServerSession.mockResolvedValue(session('CASHIER'));
        await expect(requireSession('SUPERVISOR')).rejects.toThrow(/permisos/);
    });

    it('lets a SUPERVISOR pass a SUPERVISOR minimum', async () => {
        mockGetServerSession.mockResolvedValue(session('SUPERVISOR'));
        await expect(requireSession('SUPERVISOR')).resolves.toMatchObject({ role: 'SUPERVISOR' });
    });

    it('ADMIN passes every minimum, including ones above SUPERVISOR', async () => {
        mockGetServerSession.mockResolvedValue(session('ADMIN'));
        await expect(requireSession('SUPERVISOR')).resolves.toMatchObject({ role: 'ADMIN' });
        await expect(requireSession('ADMIN')).resolves.toMatchObject({ role: 'ADMIN' });
    });
});

describe('requireAdmin / requireManager', () => {
    it('requireAdmin blocks SUPERVISOR', async () => {
        mockGetServerSession.mockResolvedValue(session('SUPERVISOR'));
        await expect(requireAdmin()).rejects.toThrow(/permisos/);
    });

    it('requireManager admits SUPERVISOR and ADMIN, blocks CASHIER', async () => {
        mockGetServerSession.mockResolvedValue(session('SUPERVISOR'));
        await expect(requireManager()).resolves.toMatchObject({ role: 'SUPERVISOR' });

        mockGetServerSession.mockResolvedValue(session('ADMIN'));
        await expect(requireManager()).resolves.toMatchObject({ role: 'ADMIN' });

        mockGetServerSession.mockResolvedValue(session('CASHIER'));
        await expect(requireManager()).rejects.toThrow(/permisos/);
    });
});

describe('requirePermission', () => {
    it('ADMIN always passes, without consulting Role.permissions', async () => {
        mockGetServerSession.mockResolvedValue(session('ADMIN'));
        await expect(requirePermission('MANAGE_CATALOG')).resolves.toMatchObject({ role: 'ADMIN' });
        expect(mockRoleFindUnique).not.toHaveBeenCalled();
    });

    it('passes when the role has the permission in Role.permissions', async () => {
        mockGetServerSession.mockResolvedValue(session('CASHIER'));
        mockRoleFindUnique.mockResolvedValue({ permissions: ['RECEIVE_INVENTORY'] });
        await expect(requirePermission('RECEIVE_INVENTORY')).resolves.toMatchObject({ role: 'CASHIER' });
    });

    it('blocks when the role lacks the permission', async () => {
        mockGetServerSession.mockResolvedValue(session('CASHIER'));
        mockRoleFindUnique.mockResolvedValue({ permissions: [] });
        await expect(requirePermission('VOID_SALE')).rejects.toThrow(/permisos/);
    });

    it('blocks when the role has no permissions row at all', async () => {
        mockGetServerSession.mockResolvedValue(session('SUPERVISOR'));
        mockRoleFindUnique.mockResolvedValue(null);
        await expect(requirePermission('VIEW_REPORTS')).rejects.toThrow(/permisos/);
    });
});
