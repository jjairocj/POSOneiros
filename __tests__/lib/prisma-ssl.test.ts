import { describe, it, expect, vi } from 'vitest';

vi.mock('dotenv/config', () => ({}));
vi.mock('@prisma/client', () => ({ PrismaClient: class {} }));
vi.mock('pg', () => ({ Pool: class {} }));
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));

import { withExplicitSslMode } from '../../lib/prisma';

describe('withExplicitSslMode', () => {
    it.each(['prefer', 'require', 'verify-ca'])('rewrites sslmode=%s to verify-full', (mode) => {
        expect(withExplicitSslMode(`postgresql://u:p@h/db?sslmode=${mode}&channel_binding=require`))
            .toBe('postgresql://u:p@h/db?sslmode=verify-full&channel_binding=require');
    });
    it('handles sslmode as the last parameter', () => {
        expect(withExplicitSslMode('postgresql://u:p@h/db?x=1&sslmode=require')).toBe('postgresql://u:p@h/db?x=1&sslmode=verify-full');
    });
    it('leaves verify-full, disable and URLs without sslmode untouched', () => {
        for (const u of ['postgresql://h/db?sslmode=verify-full', 'postgresql://h/db?sslmode=disable', 'postgresql://h/db']) {
            expect(withExplicitSslMode(u)).toBe(u);
        }
    });
    it('passes undefined through', () => {
        expect(withExplicitSslMode(undefined)).toBeUndefined();
    });
});
