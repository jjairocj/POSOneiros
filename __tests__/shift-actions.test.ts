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
import { openShift, getActiveShift, closeShift, getShiftClosePreview, getShiftCloseState } from '../app/actions/shift';
import prisma from '../lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';

vi.mock('../lib/prisma', () => ({
    default: {
        shift: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
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

// ─── closeShift: per-method cuadre + required reason ─────────────────────────

describe('closeShift — cuadre por método y motivo obligatorio', () => {
    beforeEach(() => vi.clearAllMocks());

    const openShiftWithSales = () => ({
        id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 100000,
        sales: [
            makeSale(50000, 10, [{ name: 'Café', qty: 2 }], 'CASH'),
            makeSale(30000, 11, [{ name: 'Jugo', qty: 1 }], 'CARD'),
            makeSale(20000, 12, [{ name: 'Té', qty: 1 }], 'TRANSFER'),
        ],
        user: { name: 'Ana López' },
    });

    it('closes without a reason when cash, card and transfer all match the expected amounts', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(openShiftWithSales());
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeWith(decl(50000, 30000, 20000)));

        expect(summary.difference).toBe(0);
        expect(summary.card).toEqual({ expected: 30000, declared: 30000, difference: 0 });
        expect(summary.transfer).toEqual({ expected: 20000, declared: 20000, difference: 0 });
        expect(summary.note).toBeNull();
        expect(summary.baseAmount).toBe(100000);
    });

    it.each([
        ['cash', decl(49000, 30000, 20000)],
        ['card', decl(50000, 29000, 20000)],
        ['transfer', decl(50000, 30000, 21000)],
    ])('refuses to close when only %s is off and no reason is given', async (_label, declared) => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(openShiftWithSales());

        const res = await closeWith(declared);

        expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/motivo/i) });
        expect(prisma.shift.update).not.toHaveBeenCalled();
    });

    it('treats a whitespace-only reason as missing', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(openShiftWithSales());
        expect((await closeWith(decl(0, 0, 0), '   ')).ok).toBe(false);
    });

    it('persists the full breakdown and the reason on the shift when there is a mismatch', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(openShiftWithSales());
        (prisma.shift.update as any).mockResolvedValue({});

        const summary = unwrap(await closeWith(decl(48000, 30000, 20000), '  Vuelto de más  '));

        expect(summary.difference).toBe(-2000);
        expect(summary.note).toBe('Vuelto de más');
        expect(prisma.shift.update).toHaveBeenCalledWith(expect.objectContaining({
            data: { status: 'CLOSED', closeNote: 'Vuelto de más', endTime: expect.any(Date) },
        }));
        // The frozen counts are never rewritten at close time.
        const written = (prisma.shift.update as any).mock.calls[0][0].data;
        expect(written).not.toHaveProperty('closeAmount');
        expect(written).not.toHaveProperty('closeCard');
        expect(written).not.toHaveProperty('closeTransfer');
    });

    it('refuses to close when no count was ever submitted (counts can not be passed to closeShift)', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(openShiftWithSales()); // no frozen counts
        const res = await closeShift('shift_1', 'nota');
        expect(res).toMatchObject({ ok: false, error: expect.stringMatching(/digita el conteo/i) });
        expect(prisma.shift.update).not.toHaveBeenCalled();
    });

    it('ignores any count smuggled in through extra arguments', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({ ...openShiftWithSales(), status: 'CLOSING', closeAmount: 50000, closeCard: 30000, closeTransfer: 20000 });
        (prisma.shift.update as any).mockResolvedValue({});
        const summary = unwrap(await (closeShift as any)('shift_1', undefined, { cash: 1, card: 1, transfer: 1 }));
        expect(summary.declared).toBe(50000);
        expect(summary.difference).toBe(0);
    });
});

describe('getShiftClosePreview — the count is frozen on first submission', () => {
    beforeEach(() => vi.clearAllMocks());

    const shiftBase = () => ({
        id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 100000, closeAmount: null, closeCard: null, closeTransfer: null,
        sales: [
            makeSale(50000, 10, [{ name: 'Café', qty: 2 }], 'CASH'),
            makeSale(30000, 11, [{ name: 'Jugo', qty: 1 }], 'CARD'),
            { ...makeSale(9999, 11, [{ name: 'X', qty: 1 }], 'TRANSFER'), status: 'CANCELLED' },
        ],
        user: { name: 'Ana' },
    });

    it('freezes the submitted count atomically and returns expected amounts (cancelled sales excluded)', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(shiftBase());
        (prisma.shift.updateMany as any).mockResolvedValue({ count: 1 });

        const res = await getShiftClosePreview('shift_1', decl(149000, 30000, 0));

        expect(res).toEqual({
            ok: true,
            data: { baseAmount: 100000, cashSales: 50000, cardSales: 30000, transferSales: 0, expectedCash: 50000, declared: decl(149000, 30000, 0) },
        });
        expect(prisma.shift.updateMany).toHaveBeenCalledWith({
            where: { id: 'shift_1', status: 'OPEN' },
            data: { status: 'CLOSING', closeAmount: 149000, closeCard: 30000, closeTransfer: 0 },
        });
    });

    it('revalidates /pos and /admin when the shift becomes CLOSING so the badge shows up without a reload', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(shiftBase());
        (prisma.shift.updateMany as any).mockResolvedValue({ count: 1 });
        await getShiftClosePreview('shift_1', decl(0));
        expect(revalidatePath).toHaveBeenCalledWith('/pos');
        expect(revalidatePath).toHaveBeenCalledWith('/admin');
    });

    it('a second submission can NOT replace the frozen count: the original comes back and nothing is written', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({ ...shiftBase(), status: 'CLOSING', closeAmount: 149000, closeCard: 30000, closeTransfer: 0 });

        const res: any = await getShiftClosePreview('shift_1', decl(150000, 30000, 0)); // "fixed" to match

        expect(res.data.declared).toEqual(decl(149000, 30000, 0));
        expect(prisma.shift.updateMany).not.toHaveBeenCalled();
    });

    it('if another request froze a count first (race), returns that one instead of overwriting', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any)
            .mockResolvedValueOnce(shiftBase())
            .mockResolvedValueOnce({ ...shiftBase(), status: 'CLOSING', closeAmount: 100, closeCard: 0, closeTransfer: 0 });
        (prisma.shift.updateMany as any).mockResolvedValue({ count: 0 });

        const res: any = await getShiftClosePreview('shift_1', decl(150000, 30000, 0));

        expect(res.data.declared).toEqual(decl(100, 0, 0));
    });

    it('rejects negative, non-numeric or missing counts without touching the shift', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue(shiftBase());
        expect((await getShiftClosePreview('shift_1', decl(-1))).ok).toBe(false);
        expect((await getShiftClosePreview('shift_1', { cash: NaN, card: 0, transfer: 0 })).ok).toBe(false);
        expect((await getShiftClosePreview('shift_1', { cash: 0 } as any)).ok).toBe(false);
        expect((await getShiftClosePreview('shift_1')).ok).toBe(false);
        expect(prisma.shift.updateMany).not.toHaveBeenCalled();
    });

    it("does not reveal another user's shift to a cashier", async () => {
        (getServerSession as any).mockResolvedValue(mockSession({ id: 'user_2' }));
        (prisma.shift.findUnique as any).mockResolvedValue(shiftBase());
        expect(await getShiftClosePreview('shift_1', decl(0))).toMatchObject({ ok: false, error: expect.stringMatching(/otro usuario/) });
    });

    it('fails for a shift that is not open', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({ ...shiftBase(), status: 'CLOSED' });
        expect((await getShiftClosePreview('shift_1', decl(0))).ok).toBe(false);
    });
});

describe('CLOSING is a live shift state', () => {
    beforeEach(() => vi.clearAllMocks());

    it('getActiveShift still returns the shift (and its status) while it is CLOSING, so the POS can finish closing it', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findFirst as any).mockResolvedValue({ id: 's1', status: 'CLOSING' });
        const result = await getActiveShift();
        expect(result).toMatchObject({ status: 'CLOSING' });
        expect(prisma.shift.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: { in: ['OPEN', 'CLOSING'] } }) }));
    });

    it('a user with a CLOSING shift cannot open another one, with a specific message', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.register.findUnique as any).mockResolvedValue({ id: 'reg_1', name: 'Caja 1' });
        (prisma.shift.findFirst as any).mockResolvedValueOnce({ id: 'x', status: 'CLOSING' });
        expect(await openShift(1000, 'reg_1')).toMatchObject({ ok: false, error: expect.stringMatching(/en cierre/i) });
        expect(prisma.shift.create).not.toHaveBeenCalled();
    });

    it('a register with a CLOSING shift still counts as busy for opening', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.register.findUnique as any).mockResolvedValue({ id: 'reg_1', name: 'Caja 1' });
        (prisma.shift.findFirst as any).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'x', status: 'CLOSING', user: { name: 'Luis' } });
        expect(await openShift(1000, 'reg_1')).toMatchObject({ ok: false, error: expect.stringMatching(/Luis/) });
        expect(prisma.shift.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { registerId: 'reg_1', status: { in: ['OPEN', 'CLOSING'] } } }));
    });

    it('a CLOSING shift can still be closed (confirm step)', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({ id: 'shift_1', userId: 'user_1', status: 'CLOSING', baseAmount: 0, closeAmount: 0, closeCard: 0, closeTransfer: 0, sales: [], user: { name: 'Ana' } });
        (prisma.shift.update as any).mockResolvedValue({});
        expect((await closeShift('shift_1')).ok).toBe(true);
    });

    it('a CLOSED shift can not be previewed or closed again', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({ id: 'shift_1', userId: 'user_1', status: 'CLOSED', baseAmount: 0, closeAmount: 0, sales: [], user: { name: 'Ana' } });
        expect((await closeShift('shift_1')).ok).toBe(false);
        expect((await getShiftClosePreview('shift_1')).ok).toBe(false);
    });
});

describe('getShiftCloseState', () => {
    beforeEach(() => vi.clearAllMocks());

    it('returns null until a count is frozen, then the frozen count (no expected figures)', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        const base = { id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0, sales: [], user: { name: 'Ana' } };
        (prisma.shift.findUnique as any).mockResolvedValueOnce({ ...base, closeAmount: null });
        expect(await getShiftCloseState('shift_1')).toEqual({ ok: true, data: { declared: null } });
        (prisma.shift.findUnique as any).mockResolvedValueOnce({ ...base, status: 'CLOSING', closeAmount: 5000, closeCard: 0, closeTransfer: 100 });
        expect(await getShiftCloseState('shift_1')).toEqual({ ok: true, data: { declared: { cash: 5000, card: 0, transfer: 100 } } });
    });
});

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Declared counts for closeShift; a note is passed where the test doesn't care about the cuadre. */
const decl = (cash: number, card = 0, transfer = 0) => ({ cash, card, transfer });
/**
 * closeShift takes no amounts: it uses the counts frozen on the shift. This
 * re-mocks the shift currently returned by findUnique with those counts frozen.
 */
async function closeWith(declared: { cash: number; card: number; transfer: number }, note?: string) {
    const shift = await (prisma.shift.findUnique as any)({});
    (prisma.shift.findUnique as any).mockResolvedValue({ ...shift, status: 'CLOSING', closeAmount: declared.cash, closeCard: declared.card, closeTransfer: declared.transfer });
    return closeShift('shift_1', note);
}
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

    it('queries live (OPEN or CLOSING) shifts and includes register + _count.sales', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        const mockShift = { id: 's1', status: 'OPEN', _count: { sales: 3 } };
        (prisma.shift.findFirst as any).mockResolvedValue(mockShift);

        const result = await getActiveShift();

        expect(result).toEqual(mockShift);
        expect(prisma.shift.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ status: { in: ['OPEN', 'CLOSING'] } }),
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
        expect(await closeShift('shift_1')).toEqual({ ok: false, error: 'No autenticado' });
    });

    it('throws when shift does not belong to the current user', async () => {
        (getServerSession as any).mockResolvedValue(mockSession({ id: 'user_2' }));
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [], user: { name: 'Ana' },
        });
        expect(await closeShift('shift_1')).toMatchObject({ ok: false, error: expect.stringMatching(/otro usuario/) });
    });

    it('throws when shift is already CLOSED', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'CLOSED', baseAmount: 0,
            sales: [], user: { name: 'Ana' },
        });
        expect(await closeShift('shift_1')).toMatchObject({ ok: false, error: expect.stringMatching(/no está abierto/) });
    });

    it('expected cash = CASH payments only (the base is excluded, card/transfer are not in the drawer)', async () => {
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

        const summary = unwrap(await closeWith(decl(45000, 30000, 0), 'Vuelto de más'));

        expect(summary.totalSales).toBe(80000);
        expect(summary.cashSales).toBe(50000);
        expect(summary.cardSales).toBe(30000);
        expect(summary.expected).toBe(50000);   // cash sales only, base excluded
        expect(summary.declared).toBe(45000);
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

        const summary = unwrap(await closeWith(decl(0), 'test'));

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

        const summary = unwrap(await closeWith(decl(0), 'test'));

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

        const summary = unwrap(await closeWith(decl(0)));

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

        const summary = unwrap(await closeWith(decl(0), 'test'));

        expect(summary.userName).toBe('Carlos Ruiz');
    });

    it('marks the shift as CLOSED in the database', async () => {
        (getServerSession as any).mockResolvedValue(mockSession());
        (prisma.shift.findUnique as any).mockResolvedValue({
            id: 'shift_1', userId: 'user_1', status: 'OPEN', baseAmount: 0,
            sales: [], user: { name: 'Ana' },
        });
        (prisma.shift.update as any).mockResolvedValue({ id: 'shift_1', status: 'CLOSED' });

        await closeWith(decl(0));

        expect(prisma.shift.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'shift_1' },
                data: expect.objectContaining({ status: 'CLOSED' }),
            })
        );
    });
});
