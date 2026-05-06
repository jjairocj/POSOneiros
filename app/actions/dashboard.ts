"use server";

import prisma from "../../lib/prisma";

export interface HourlySale {
    hour: number;
    label: string;
    total: number;
    count: number;
}

export interface TopProduct {
    productId: string;
    name: string;
    totalQty: number;
}

export interface RecentSale {
    id: string;
    time: string;
    total: number;
    mainPaymentMethod: string | null;
}

export interface LowStockItem {
    id: string;
    code: string;
    name: string;
    stock: number;
    price: number;
}

export interface DashboardData {
    kpis: {
        todaySales: number;
        todayTransactions: number;
        activeShiftRegister: string | null;
        lowStockCount: number;
    };
    hourlySales: HourlySale[];
    topProducts: TopProduct[];
    recentSales: RecentSale[];
    lowStockProducts: LowStockItem[];
}

export async function getDashboardData(): Promise<DashboardData> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const start24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [todaySales, activeShift, lowStockCount, lowStockProducts, salesLast24h, topProductsRaw, recentSalesRaw] =
        await Promise.all([
            // 1. Aggregate today's sales
            prisma.sale.aggregate({
                where: {
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    status: "COMPLETED",
                },
                _sum: { total: true },
                _count: { id: true },
            }),

            // 2. Active shift
            prisma.shift.findFirst({
                where: { status: "OPEN" },
                include: { register: { select: { name: true } } },
                orderBy: { startTime: "desc" },
            }),

            // 3. Low stock count
            prisma.product.count({
                where: { stock: { lt: 5 } },
            }),

            // 4. Low stock product list (for actionable panel)
            prisma.product.findMany({
                where: { stock: { lte: 5 }, isActive: true },
                select: { id: true, code: true, name: true, stock: true, price: true },
                orderBy: { stock: "asc" },
                take: 20,
            }),

            // 5. Sales last 24h for hourly chart
            prisma.sale.findMany({
                where: {
                    createdAt: { gte: start24h },
                    status: "COMPLETED",
                },
                select: { createdAt: true, total: true },
                orderBy: { createdAt: "asc" },
            }),

            // 5. Top 5 products today by quantity sold
            prisma.saleDetail.findMany({
                where: {
                    sale: {
                        createdAt: { gte: startOfDay, lte: endOfDay },
                        status: "COMPLETED",
                    },
                },
                select: {
                    productId: true,
                    quantity: true,
                    product: { select: { name: true } },
                },
            }),

            // 6. Last 5 completed sales
            prisma.sale.findMany({
                where: { status: "COMPLETED" },
                orderBy: { createdAt: "desc" },
                take: 5,
                select: {
                    id: true,
                    total: true,
                    createdAt: true,
                    payments: {
                        select: { method: true, amount: true },
                        orderBy: { amount: "desc" },
                        take: 1,
                    },
                },
            }),
        ]);

    // Build hourly chart data (last 24h, one bucket per hour)
    const hourlyMap = new Map<number, { total: number; count: number }>();
    for (const sale of salesLast24h) {
        const h = new Date(sale.createdAt).getHours();
        const existing = hourlyMap.get(h) ?? { total: 0, count: 0 };
        hourlyMap.set(h, { total: existing.total + sale.total, count: existing.count + 1 });
    }

    const hourlySales: HourlySale[] = Array.from({ length: 24 }, (_, i) => {
        const data = hourlyMap.get(i);
        return {
            hour: i,
            label: `${String(i).padStart(2, "0")}:00`,
            total: data?.total ?? 0,
            count: data?.count ?? 0,
        };
    });

    // Aggregate top products
    const productMap = new Map<string, { name: string; qty: number }>();
    for (const detail of topProductsRaw) {
        const existing = productMap.get(detail.productId) ?? { name: detail.product.name, qty: 0 };
        productMap.set(detail.productId, {
            name: existing.name,
            qty: existing.qty + detail.quantity,
        });
    }
    const topProducts: TopProduct[] = Array.from(productMap.entries())
        .map(([productId, { name, qty }]) => ({ productId, name, totalQty: qty }))
        .sort((a, b) => b.totalQty - a.totalQty)
        .slice(0, 5);

    // Format recent sales
    const recentSales: RecentSale[] = recentSalesRaw.map((s) => ({
        id: s.id,
        time: new Date(s.createdAt).toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
        }),
        total: s.total,
        mainPaymentMethod: s.payments[0]?.method ?? null,
    }));

    return {
        kpis: {
            todaySales: todaySales._sum.total ?? 0,
            todayTransactions: todaySales._count.id,
            activeShiftRegister: activeShift?.register.name ?? null,
            lowStockCount,
        },
        hourlySales,
        topProducts,
        recentSales,
        lowStockProducts,
    };
}
