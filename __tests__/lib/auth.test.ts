import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetServerSession = vi.fn();
vi.mock('next-auth/next', () => ({ getServerSession: (...a: unknown[]) => mockGetServerSession(...a) }));
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }));

import { requireSession, requireAdmin, requireManager, roleAtLeast, AuthError } from '../../lib/auth';

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
