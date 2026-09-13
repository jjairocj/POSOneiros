import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaleFindMany = vi.fn();
const mockSaleFindFirst = vi.fn();
const mockSaleAggregate = vi.fn();
const mockSaleFindUnique = vi.fn();
const mockSaleDetailFindMany = vi.fn();
const mockRequirePermission = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        sale: {
            findMany: (...a: any[]) => mockSaleFindMany(...a),
            findFirst: (...a: any[]) => mockSaleFindFirst(...a),
            aggregate: (...a: any[]) => mockSaleAggregate(...a),
            findUnique: (...a: any[]) => mockSaleFindUnique(...a),
        },
        saleDetail: { findMany: (...a: any[]) => mockSaleDetailFindMany(...a) },
    },
}));
vi.mock('@/lib/auth', () => ({ requirePermission: (...a: any[]) => mockRequirePermission(...a) }));

import { getSalesAnalytics, getSalesHistoryList, getSaleForPrint, getProductRankingReport, getPromotionUsageReport } from '../../app/actions/report';

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

describe('getProductRankingReport', () => {
    it('requires VIEW_REPORTS and aggregates quantity/revenue/margin by product', async () => {
        mockSaleDetailFindMany.mockResolvedValue([
            { productId: 'p1', quantity: 2, subtotal: 40000, product: { name: 'Buldak Ramen', code: 'MA4', cost: 12000 } },
            { productId: 'p1', quantity: 1, subtotal: 20000, product: { name: 'Buldak Ramen', code: 'MA4', cost: 12000 } },
            { productId: 'p2', quantity: 5, subtotal: 10000, product: { name: 'Agua 500 ml', code: 'AD07', cost: 500 } },
        ]);
        const result: any = await getProductRankingReport();
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_REPORTS');
        expect(result.success).toBe(true);
        // Sorted by quantity sold descending.
        expect(result.rows[0]).toEqual(expect.objectContaining({ productId: 'p2', quantitySold: 5, revenue: 10000, estimatedCost: 2500, margin: 7500 }));
        expect(result.rows[1]).toEqual(expect.objectContaining({ productId: 'p1', quantitySold: 3, revenue: 60000, estimatedCost: 36000, margin: 24000 }));
        expect(result.rows[1].marginPercent).toBeCloseTo(40, 5);
    });

    it('filters by shiftId instead of a date range when given', async () => {
        mockSaleDetailFindMany.mockResolvedValue([]);
        await getProductRankingReport({ shiftId: 'shift1', startDate: new Date(), endDate: new Date() });
        expect(mockSaleDetailFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { sale: { status: 'COMPLETED', shiftId: 'shift1' } },
        }));
    });

    it('falls back to a placeholder name for a deleted product', async () => {
        mockSaleDetailFindMany.mockResolvedValue([{ productId: 'p1', quantity: 1, subtotal: 1000, product: null }]);
        const result: any = await getProductRankingReport();
        expect(result.rows[0].productName).toBe('Producto eliminado');
        expect(result.rows[0].estimatedCost).toBe(0);
    });

    it('returns a failure result instead of throwing on a DB error', async () => {
        mockSaleDetailFindMany.mockRejectedValue(new Error('db down'));
        const result: any = await getProductRankingReport();
        expect(result.success).toBe(false);
    });
});

describe('getPromotionUsageReport', () => {
    it('requires VIEW_REPORTS and aggregates usage/discount/revenue by promotion', async () => {
        mockSaleFindMany.mockResolvedValue([
            { promotionId: 'promo1', promotionName: 'Buldak -> Agua gratis', discount: 2000, total: 24000 },
            { promotionId: 'promo1', promotionName: 'Buldak -> Agua gratis', discount: 2000, total: 22000 },
            { promotionId: 'promo2', promotionName: '20% en Shin Ramen', discount: 4000, total: 16000 },
        ]);
        const result: any = await getPromotionUsageReport();
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_REPORTS');
        expect(result.success).toBe(true);
        // Sorted by timesUsed descending.
        expect(result.rows[0]).toEqual({ promotionId: 'promo1', promotionName: 'Buldak -> Agua gratis', timesUsed: 2, totalDiscount: 4000, totalRevenue: 46000 });
        expect(result.rows[1]).toEqual({ promotionId: 'promo2', promotionName: '20% en Shin Ramen', timesUsed: 1, totalDiscount: 4000, totalRevenue: 16000 });
    });

    it('only queries sales that actually used a promotion', async () => {
        mockSaleFindMany.mockResolvedValue([]);
        await getPromotionUsageReport();
        expect(mockSaleFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ status: 'COMPLETED', promotionId: { not: null } }),
        }));
    });

    it('falls back to a placeholder name for a deleted promotion', async () => {
        mockSaleFindMany.mockResolvedValue([{ promotionId: 'promo1', promotionName: null, discount: 1000, total: 5000 }]);
        const result: any = await getPromotionUsageReport();
        expect(result.rows[0].promotionName).toBe('Promoción eliminada');
    });

    it('returns a failure result instead of throwing on a DB error', async () => {
        mockSaleFindMany.mockRejectedValue(new Error('db down'));
        const result: any = await getPromotionUsageReport();
        expect(result.success).toBe(false);
    });
});
