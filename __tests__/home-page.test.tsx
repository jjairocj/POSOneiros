/**
 * @file home-page.test.tsx
 * @description Tests for the Home page server component.
 *
 * The Home component reads the NextAuth session on the server and immediately
 * redirects the user based on their authentication state and role:
 *
 * - No session  → /login
 * - ADMIN role  → /admin
 * - Any other   → /pos
 *
 * Because `redirect()` throws internally in Next.js (it throws a special
 * NEXT_REDIRECT error), we assert that the thrown value contains the expected
 * destination URL.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth/next';

// next/navigation redirect throws a special object — we just capture the throw.
vi.mock('next/navigation', () => ({
    redirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT:${url}`); }),
}));

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

// authOptions is only used as an argument to getServerSession; mock the module.
vi.mock('../app/api/auth/[...nextauth]/route', () => ({
    authOptions: {},
}));

async function renderHome() {
    const { default: Home } = await import('../app/page');
    return Home();
}

describe('Home page — smart redirect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-import fresh module each time to avoid module cache issues
        vi.resetModules();
    });

    it('redirects to /login when there is no active session', async () => {
        (getServerSession as any).mockResolvedValue(null);
        await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT:/login');
    });

    it('redirects to /admin when the user has the ADMIN role', async () => {
        (getServerSession as any).mockResolvedValue({ user: { role: 'ADMIN' } });
        await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT:/admin');
    });

    it('redirects to /pos for a regular (non-admin) authenticated user', async () => {
        (getServerSession as any).mockResolvedValue({ user: { role: 'CASHIER' } });
        await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT:/pos');
    });

    it('redirects to /pos when role is undefined (session exists but no role field)', async () => {
        (getServerSession as any).mockResolvedValue({ user: {} });
        await expect(renderHome()).rejects.toThrow('NEXT_REDIRECT:/pos');
    });
});
