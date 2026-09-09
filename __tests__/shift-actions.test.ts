/**
 * @file shift-actions.test.ts
 * @description Unit tests for shift server actions: openShift, getActiveShift, closeShift.
 *
 * All Prisma calls and NextAuth session resolution are mocked so tests run
 * without a real database or HTTP server.
 *
 * Key behaviours covered:
 * - Authentication guard (throws when no session)
 * - getActiveShift includes _count.sales for the ShiftHeader counter
 * - closeShift computes the narrative summary:
 *     totalSales, transactionCount, topProduct, peakHour, userName, difference
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openShift, getActiveShift, closeShift } from '../app/actions/shift';
import prisma from '../lib/prisma';
import { getServerSession } from 'next-auth/next';

vi.mock('../lib/prisma', () => ({
    default: {
        shift: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        register: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const unwrap = (res: any) => { if (!res.ok) throw new Error(res.error); return res.data.summary; };
const mockSession = (overrides: object = {}) => ({ user: { id: 'user_1', name: 'Ana López', ...overrides } });

function makeSale(total: number, hour: number, products: { name: string; qty: number }[], method: 'CASH' | 'CARD' | 'TRANSFER' = 'CASH') {
    const createdAt = new Date(`2026-09-09T${String(hour).padStart(2, '0')}:00:00-05:00`); // Bogotá time
    return {
        total,
        status: 'COMPLETED',
        createdAt,
        details: products.map(p => ({ quantity: p.qty, productName: p.name })),
        payments: [{ method, amount: total }],
    };
}

// ─── getActiveShift ───────────────────────────────────────────────────────────

describe('getActiveShift', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns null when there is no session', async () => {
        (getServerSession as any).mockResolvedValue(null);
        expect(await getActiveShift()).toBeNull();
    });

    it('queries shifts with OPEN status and includes register + _count.sales', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        const mockShift = { id: 's1', status: 'OPEN', _count: { sales: 3 } };
        (prisma.shift.findFirst as any).mockResolvedValue(mockShift);

        const result = await getActiveShift();

        expect(result).toEqual(mockShift);
        expect(prisma.shift.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: 'OPEN' }),
                include: expect.objectContaining({
                    register: true,
                    _count: { select: { sales: true } },
                }),
            })
        );
    });

    it('returns null when no open shift exists for the user', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findFirst as any).mockResolvedValue(null);
        expect(await getActiveShift()).toBeNull();
    });
});

// ─── openShift ────────────────────────────────────────────────────────────────

describe('openShift', () => {
    beforeEach(() => vi.clearAllMocks());

    it('fails when not authenticated', async () => {
        (getServerSession as any).mockResolvedValue(null);
        expect(await openShift(100000, 'reg_1')).toEqual({ ok: false, error: 'No autenticado' });
    });

    it('rejects a negative base', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        expect((await openShift(-5, 'reg_1')).ok).toBe(false);
    });

    it('refuses to open a second shift for the same user', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.register.findUnique as any).mockResolvedValue({ id: 'reg_1', name: 'Caja 1' });
        (prisma.shift.findFirst as any).mockResolvedValueOnce({ id: 'already_open' });
        expect(await openShift(1000, 'reg_1')).toMatchObject({ ok: false, error: expect.stringMatching(/Ya tienes un turno abierto/) });
        expect(prisma.shift.create).not.toHaveBeenCalled();
    });

    it('refuses to open on a register already in use', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.register.findUnique as any).mockResolvedValue({ id: 'reg_1', name: 'Caja 1' });
        (prisma.shift.findFirst as any).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'x', user: { name: 'Luis' } });
        expect(await openShift(1000, 'reg_1')).toMatchObject({ ok: false, error: expect.stringMatching(/Luis/) });
    });

    it('creates a shift with OPEN status and correct base amount', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.register.findUnique as any).mockResolvedValue({ id: 'reg_1', name: 'Caja 1' });
        (prisma.shift.findFirst as any).mockResolvedValue(null);
        const created = { id: 'shift_new', baseAmount: 100000, status: 'OPEN', userId: 'user_1', registerId: 'reg_1' };
        (prisma.shift.create as any).mockResolvedValue(created);

        const result = await openShift(100000, 'reg_1');

        expect(result).toEqual({ ok: true, data: { id: 'shift_new' } });
        expect(prisma.shift.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ baseAmount: 100000, status: 'OPEN', registerId: 'reg_1' }),
            })
        );
    });
});

// ─── closeShift ───────────────────────────────────────────────────────────────

describe('closeShift', () => {
    beforeEach(() => vi.clearAllMocks());

    it('throws when not authenticated', async () => {
        (getServerSession as any).mockResolvedValue(null);
        expect(await closeShift('shift_1', 500000)).toEqual({ ok: false, error: 'No autenticado' });
    });

    it('throws when shift does not belong to the current user', async () => {
        (getServerSession as any).mockResolvedValue(mockSession({ id: 'user_2' }));
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [], user: { name: 'Ana' },
        });
        expect(await closeShift('shift_1', 0)).toMatchObject({ ok: false, error: expect.stringMatching(/otro usuario/) });
    });

    it('throws when shift is already CLOSED', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'CLOSED', baseAmount: 0,
            sales: [], user: { name: 'Ana' },
        });
        expect(await closeShift('shift_1', 0)).toMatchObject({ ok: false, error: expect.stringMatching(/no está abierto/) });
    });

    it('expected cash = base + CASH payments only (card/transfer are not in the drawer)', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 100000,
            sales: [
                makeSale(50000, 10, [{ name: 'Café', qty: 2 }], 'CASH'),
                makeSale(30000, 11, [{ name: 'Jugo', qty: 1 }], 'CARD'),
                { ...makeSale(9999, 11, [{ name: 'Anulada', qty: 1 }], 'CASH'), status: 'CANCELLED' },
            ],
            user: { name: 'Ana López' },
        });
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeShift('shift_1', 145000));

        expect(summary.totalSales).toBe(80000);
        expect(summary.cashSales).toBe(50000);
        expect(summary.cardSales).toBe(30000);
        expect(summary.expected).toBe(150000);   // 100000 base + 50000 cash
        expect(summary.declared).toBe(145000);
        expect(summary.difference).toBe(-5000);  // shortage
        expect(summary.transactionCount).toBe(2);
        expect(summary.cancelledCount).toBe(1);
    });

    it('identifies the top product by total quantity sold', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [
                makeSale(10000, 9, [{ name: 'Empanada', qty: 3 }, { name: 'Café', qty: 1 }]),
                makeSale(5000, 10, [{ name: 'Café', qty: 4 }]),
            ],
            user: { name: 'Ana' },
        });
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeShift('shift_1', 0));

        // Café: 1 + 4 = 5 units; Empanada: 3 units → Café wins
        expect(summary.topProduct).toBe('Café');
    });

    it('identifies the peak hour correctly', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [
                makeSale(1000, 12, [{ name: 'X', qty: 1 }]),
                makeSale(1000, 12, [{ name: 'X', qty: 1 }]),
                makeSale(1000, 14, [{ name: 'X', qty: 1 }]),
            ],
            user: { name: 'Ana' },
        });
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeShift('shift_1', 0));

        expect(summary.peakHour).toBe(12);
    });

    it('returns null for topProduct and peakHour when the shift has no sales', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 50000,
            sales: [],
            user: { name: 'Ana' },
        });
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeShift('shift_1', 50000));

        expect(summary.topProduct).toBeNull();
        expect(summary.peakHour).toBeNull();
        expect(summary.transactionCount).toBe(0);
        expect(summary.difference).toBe(0);
    });

    it('returns the userName from the shift owner', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [],
            user: { name: 'Carlos Ruiz' },
        });
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeShift('shift_1', 0));

        expect(summary.userName).toBe('Carlos Ruiz');
    });

    it('marks the shift as CLOSED in the database', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [], user: { name: 'Ana' },
        });
        (prisma.shift.update as any).mockResolvedValue({ id: 'shift_1', status: 'CLOSED' });

        await closeShift('shift_1', 0);

        expect(prisma.shift.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'shift_1' },
                data: expect.objectContaining({ status: 'CLOSED' }),
            })
        );
    });
});
