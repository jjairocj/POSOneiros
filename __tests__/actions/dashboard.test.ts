import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSaleAggregate = vi.fn();
const mockShiftFindFirst = vi.fn();
const mockProductCount = vi.fn();
const mockProductFindMany = vi.fn();
const mockSaleFindMany = vi.fn();
const mockSaleDetailFindMany = vi.fn();
const mockRequirePermission = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        sale: { aggregate: (...a: any[]) => mockSaleAggregate(...a), findMany: (...a: any[]) => mockSaleFindMany(...a) },
        shift: { findFirst: (...a: any[]) => mockShiftFindFirst(...a) },
        product: { count: (...a: any[]) => mockProductCount(...a), findMany: (...a: any[]) => mockProductFindMany(...a) },
        saleDetail: { findMany: (...a: any[]) => mockSaleDetailFindMany(...a) },
    },
}));
vi.mock('@/lib/auth', () => ({ requirePermission: (...a: any[]) => mockRequirePermission(...a) }));

import { getDashboardData } from '../../app/actions/dashboard';

function defaultMocks() {
    mockRequirePermission.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
    mockSaleAggregate.mockResolvedValue({ _sum: { total: 0 }, _count: { id: 0 } });
    mockShiftFindFirst.mockResolvedValue(null);
    mockProductCount.mockResolvedValue(0);
    mockProductFindMany.mockResolvedValue([]);
    mockSaleFindMany.mockResolvedValue([]);
    mockSaleDetailFindMany.mockResolvedValue([]);
}

beforeEach(() => {
    vi.clearAllMocks();
    defaultMocks();
});

describe('getDashboardData', () => {
    it('requires VIEW_DASHBOARD', async () => {
        await getDashboardData();
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_DASHBOARD');
    });

    it('propagates the permission error instead of swallowing it', async () => {
        mockRequirePermission.mockRejectedValue(new Error('forbidden'));
        await expect(getDashboardData()).rejects.toThrow('forbidden');
    });

    it("fills today's KPIs from the aggregate and active shift", async () => {
        mockSaleAggregate.mockResolvedValue({ _sum: { total: 275000 }, _count: { id: 8 } });
        mockShiftFindFirst.mockResolvedValue({ register: { name: 'Caja Principal' } });
        mockProductCount.mockResolvedValue(3);
        const result = await getDashboardData();
        expect(result.kpis).toEqual({
            todaySales: 275000,
            todayTransactions: 8,
            activeShiftRegister: 'Caja Principal',
            lowStockCount: 3,
        });
    });

    it('defaults todaySales to 0 when there are no completed sales', async () => {
        mockSaleAggregate.mockResolvedValue({ _sum: { total: null }, _count: { id: 0 } });
        const result = await getDashboardData();
        expect(result.kpis.todaySales).toBe(0);
        expect(result.kpis.activeShiftRegister).toBeNull();
    });

    it('aggregates and ranks top products by quantity, capped at 5', async () => {
        mockSaleDetailFindMany.mockResolvedValue([
            { productId: 'p1', quantity: 3, product: { name: 'Buldak Ramen' } },
            { productId: 'p1', quantity: 2, product: { name: 'Buldak Ramen' } },
            { productId: 'p2', quantity: 10, product: { name: 'Agua 500 ml' } },
            { productId: 'p3', quantity: 1, product: { name: 'C' } },
            { productId: 'p4', quantity: 1, product: { name: 'D' } },
            { productId: 'p5', quantity: 1, product: { name: 'E' } },
            { productId: 'p6', quantity: 1, product: { name: 'F' } },
        ]);
        const result = await getDashboardData();
        expect(result.topProducts).toHaveLength(5);
        expect(result.topProducts[0]).toEqual({ productId: 'p2', name: 'Agua 500 ml', totalQty: 10 });
        expect(result.topProducts[1]).toEqual({ productId: 'p1', name: 'Buldak Ramen', totalQty: 5 });
    });

    it('buckets last-24h sales into 24 hourly slots with the correct totals', async () => {
        // sale.findMany backs both the 24h-chart query and the "recent sales"
        // query (same mock, called twice) — payments must be present so the
        // second call's .map() doesn't blow up on these same fixture rows.
        mockSaleFindMany.mockResolvedValue([
            { createdAt: new Date('2026-09-12T14:30:00-05:00'), total: 10000, payments: [] },
            { createdAt: new Date('2026-09-12T14:45:00-05:00'), total: 5000, payments: [] },
            { createdAt: new Date('2026-09-12T09:00:00-05:00'), total: 2000, payments: [] },
        ]);
        const result = await getDashboardData();
        expect(result.hourlySales).toHaveLength(24);
        const hour14 = result.hourlySales.find((h) => h.hour === 14)!;
        expect(hour14.total).toBe(15000);
        expect(hour14.count).toBe(2);
        const hour9 = result.hourlySales.find((h) => h.hour === 9)!;
        expect(hour9.total).toBe(2000);
        const hour0 = result.hourlySales.find((h) => h.hour === 0)!;
        expect(hour0).toEqual({ hour: 0, label: '00:00', total: 0, count: 0 });
    });

    it("formats each recent sale's main payment method from the highest single payment", async () => {
        mockSaleFindMany.mockResolvedValue([
            { id: 's1', total: 21000, createdAt: new Date('2026-09-12T10:00:00-05:00'), payments: [{ method: 'CARD', amount: 21000 }] },
            { id: 's2', total: 5000, createdAt: new Date('2026-09-12T11:00:00-05:00'), payments: [] },
        ]);
        const result = await getDashboardData();
        expect(result.recentSales[0]).toEqual(expect.objectContaining({ id: 's1', total: 21000, mainPaymentMethod: 'CARD' }));
        expect(result.recentSales[1].mainPaymentMethod).toBeNull();
    });

    it('passes low-stock products through unchanged', async () => {
        const items = [{ id: 'p1', code: 'C1', name: 'Agua', stock: 2, price: 2000 }];
        mockProductFindMany.mockResolvedValue(items);
        const result = await getDashboardData();
        expect(result.lowStockProducts).toEqual(items);
    });
});
