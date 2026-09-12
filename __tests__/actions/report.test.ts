import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaleFindMany = vi.fn();
const mockSaleFindFirst = vi.fn();
const mockSaleAggregate = vi.fn();
const mockSaleFindUnique = vi.fn();
const mockRequirePermission = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        sale: {
            findMany: (...a: any[]) => mockSaleFindMany(...a),
            findFirst: (...a: any[]) => mockSaleFindFirst(...a),
            aggregate: (...a: any[]) => mockSaleAggregate(...a),
            findUnique: (...a: any[]) => mockSaleFindUnique(...a),
        },
    },
}));
vi.mock('@/lib/auth', () => ({ requirePermission: (...a: any[]) => mockRequirePermission(...a) }));

import { getSalesAnalytics, getSalesHistoryList, getSaleForPrint } from '../../app/actions/report';

function sale(overrides: object = {}) {
    return {
        id: 's1', total: 10000, createdAt: new Date(), status: 'COMPLETED',
        payments: [{ method: 'CASH', amount: 10000 }],
        details: [{ subtotal: 10000, product: { category: { name: 'Snacks' } } }],
        ...overrides,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    mockSaleFindFirst.mockResolvedValue(null);
    mockSaleAggregate.mockResolvedValue({ _sum: { total: 0 } });
});

describe('getSalesAnalytics', () => {
    it('requires VIEW_REPORTS', async () => {
        mockSaleFindMany.mockResolvedValue([]);
        await getSalesAnalytics();
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_REPORTS');
    });

    it('filters by shiftId when given, ignoring any date range', async () => {
        mockSaleFindMany.mockResolvedValue([]);
        await getSalesAnalytics({ shiftId: 'shift1', startDate: new Date('2026-01-01'), endDate: new Date('2026-01-31') });
        expect(mockSaleFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'COMPLETED', shiftId: 'shift1' } }));
    });

    it('sums revenue and splits payment methods into cash/card/online', async () => {
        mockSaleFindMany.mockResolvedValue([
            sale({ total: 10000, payments: [{ method: 'CASH', amount: 10000 }] }),
            sale({ total: 5000, payments: [{ method: 'CARD', amount: 3000 }, { method: 'TRANSFER', amount: 2000 }] }),
        ]);
        const result: any = await getSalesAnalytics();
        expect(result.success).toBe(true);
        expect(result.kpis.totalRevenue).toBe(15000);
        expect(result.kpis.totalSalesCount).toBe(2);
        expect(result.kpis.ticketPromedio).toBe(7500);
        expect(result.paymentBreakdown).toEqual({ cash: 10000, card: 3000, online: 2000 });
    });

    it('groups category revenue, defaulting missing categories to "Sin Categoría", sorted descending', async () => {
        mockSaleFindMany.mockResolvedValue([
            sale({ details: [{ subtotal: 3000, product: { category: { name: 'Bebidas' } } }] }),
            sale({ details: [{ subtotal: 9000, product: { category: null } }] }),
        ]);
        const result: any = await getSalesAnalytics();
        expect(result.charts.categorySales).toEqual([
            { name: 'Sin Categoría', value: 9000 },
            { name: 'Bebidas', value: 3000 },
        ]);
    });

    it('reports trafficLight "gray" when there is no revenue in the period', async () => {
        mockSaleFindMany.mockResolvedValue([]);
        const result: any = await getSalesAnalytics();
        expect(result.trafficLight.status).toBe('gray');
    });

    it('reports trafficLight "green" when the period beats the historical daily average', async () => {
        mockSaleFindFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 9 * 86400000) }); // 10 days in business
        mockSaleAggregate.mockResolvedValue({ _sum: { total: 100000 } }); // avg 10k/day historically
        const start = new Date();
        const end = new Date();
        mockSaleFindMany.mockResolvedValue([sale({ total: 50000, createdAt: start })]); // 50k in 1 day >> 10k avg
        const result: any = await getSalesAnalytics({ startDate: start, endDate: end });
        expect(result.trafficLight.status).toBe('green');
    });

    it('reports trafficLight "red" when the period badly trails the historical average', async () => {
        mockSaleFindFirst.mockResolvedValue({ createdAt: new Date(Date.now() - 9 * 86400000) });
        mockSaleAggregate.mockResolvedValue({ _sum: { total: 1000000 } }); // avg 100k/day historically
        const start = new Date();
        const end = new Date();
        mockSaleFindMany.mockResolvedValue([sale({ total: 1000, createdAt: start })]);
        const result: any = await getSalesAnalytics({ startDate: start, endDate: end });
        expect(result.trafficLight.status).toBe('red');
    });

    it('groups the sales trend by business day, sorted ascending', async () => {
        mockSaleFindMany.mockResolvedValue([
            sale({ total: 1000, createdAt: new Date('2026-09-10T12:00:00-05:00') }),
            sale({ total: 2000, createdAt: new Date('2026-09-09T12:00:00-05:00') }),
            sale({ total: 500, createdAt: new Date('2026-09-10T18:00:00-05:00') }),
        ]);
        const result: any = await getSalesAnalytics();
        expect(result.charts.trendingSales).toHaveLength(2);
        expect(result.charts.trendingSales[0].total).toBe(2000);
        expect(result.charts.trendingSales[1].total).toBe(1500);
    });

    it('returns a failure result instead of throwing when the query rejects', async () => {
        mockSaleFindMany.mockRejectedValue(new Error('db down'));
        const result: any = await getSalesAnalytics();
        expect(result.success).toBe(false);
    });
});

describe('getSalesHistoryList', () => {
    it('requires VIEW_REPORTS and formats shortId with the register prefix', async () => {
        mockSaleFindMany.mockResolvedValue([
            { id: 's1', number: 17, cancelReason: null, createdAt: new Date(), total: 24000, status: 'COMPLETED', shiftId: 'sh1', payments: [{ method: 'CASH' }, { method: 'CARD' }], shift: { user: { name: 'Jhon' }, register: { prefix: 'POS' } } },
        ]);
        const result = await getSalesHistoryList();
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_REPORTS');
        expect(result[0].shortId).toBe('POS-17');
        expect(result[0].sellerName).toBe('Jhon');
        expect(result[0].payments).toBe('CASH, CARD');
    });

    it('falls back to a truncated uppercase id when there is no sale number', async () => {
        mockSaleFindMany.mockResolvedValue([
            { id: 'abcdefgh12345', number: null, cancelReason: null, createdAt: new Date(), total: 1000, status: 'COMPLETED', shiftId: null, payments: [], shift: null },
        ]);
        const result = await getSalesHistoryList();
        expect(result[0].shortId).toBe('ABCDEFGH');
        expect(result[0].sellerName).toBe('Desconocido');
    });

    it('returns an empty array on error instead of throwing', async () => {
        mockSaleFindMany.mockRejectedValue(new Error('db down'));
        expect(await getSalesHistoryList()).toEqual([]);
    });
});

describe('getSaleForPrint', () => {
    it('requires VIEW_REPORTS and serializes dates', async () => {
        mockSaleFindUnique.mockResolvedValue({
            id: 's1', createdAt: new Date(), updatedAt: new Date(),
            details: [{ id: 'd1', createdAt: new Date(), product: {} }],
            payments: [], shift: null, customer: null,
        });
        const result: any = await getSaleForPrint('s1');
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_REPORTS');
        expect(result.success).toBe(true);
        expect(typeof result.sale.createdAt).toBe('string');
        expect(typeof result.sale.details[0].createdAt).toBe('string');
    });

    it('returns a failure result when the sale does not exist', async () => {
        mockSaleFindUnique.mockResolvedValue(null);
        const result: any = await getSaleForPrint('missing');
        expect(result.success).toBe(false);
    });

    it('returns a failure result instead of throwing on a DB error', async () => {
        mockSaleFindUnique.mockRejectedValue(new Error('db down'));
        const result: any = await getSaleForPrint('s1');
        expect(result.success).toBe(false);
    });
});
