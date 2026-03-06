"use server";

import prisma from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, differenceInDays } from "date-fns";

interface AnalyticsFilters {
    startDate?: Date;
    endDate?: Date;
    shiftId?: string;
}

export async function getSalesAnalytics(filters: AnalyticsFilters = {}) {
    const { startDate, endDate, shiftId } = filters;

    // Date range for query
    const where: any = {
        status: "COMPLETED"
    };

    if (shiftId) {
        where.shiftId = shiftId;
    } else if (startDate && endDate) {
        where.createdAt = {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate)
        };
    }

    try {
        // 1. Fetch Sales in Date Range
        const sales = await prisma.sale.findMany({
            where,
            include: {
                payments: true,
                details: {
                    include: {
                        product: {
                            include: { category: true }
                        }
                    }
                }
            }
        });

        // Calculate Totals and Payment Methods Breakdowns
        let totalRevenue = 0;
        let cashTotal = 0;
        let cardTotal = 0;
        let onlineTotal = 0;

        const categorySalesMap = new Map<string, number>();

        for (const sale of sales) {
            totalRevenue += sale.total;
            for (const payment of sale.payments) {
                if (payment.method === "CASH") cashTotal += payment.amount;
                else if (payment.method === "CARD") cardTotal += payment.amount;
                else if (payment.method === "TRANSFER") onlineTotal += payment.amount;
            }

            for (const detail of sale.details) {
                const categoryName = detail.product?.category?.name || "Sin Categoría";
                categorySalesMap.set(
                    categoryName,
                    (categorySalesMap.get(categoryName) || 0) + detail.subtotal
                );
            }
        }

        const categorySales = Array.from(categorySalesMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 2. Traffic Light Calculation (Semáforo)
        // Let's calculate the historical average daily revenue
        // First get the very first sale date to know total days in business
        const firstSale = await prisma.sale.findFirst({
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true }
        });

        let averageDailyRevenue = 0;
        if (firstSale) {
            const allTimeSalesResult = await prisma.sale.aggregate({
                _sum: { total: true },
                where: { status: "COMPLETED" }
            });
            const allTimeRevenue = allTimeSalesResult._sum.total || 0;
            const totalDaysInBusiness = Math.max(1, differenceInDays(new Date(), firstSale.createdAt) + 1);
            averageDailyRevenue = allTimeRevenue / totalDaysInBusiness;
        }

        // Calculate average daily revenue for the SELECTED period
        let selectedPeriodDailyAverage = 0;
        if (sales.length > 0) {
            const actualStartDate = startDate || sales[0].createdAt;
            const actualEndDate = endDate || new Date();
            const selectedDays = Math.max(1, differenceInDays(actualEndDate, actualStartDate) + 1);
            selectedPeriodDailyAverage = totalRevenue / selectedDays;
        }

        // Traffic Light Logic: 
        // Green if >= 100% of average, Yellow if >= 80%, Red if < 80%
        let trafficLight = "red";
        const performanceRatio = averageDailyRevenue > 0 ? (selectedPeriodDailyAverage / averageDailyRevenue) : 1;

        if (totalRevenue === 0) trafficLight = "gray";
        else if (performanceRatio >= 1.0) trafficLight = "green";
        else if (performanceRatio >= 0.8) trafficLight = "yellow";
        else trafficLight = "red";


        // 3. Sales Trend over time (for AreaChart) - Group by Day
        const trendingMap = new Map<string, number>();
        for (const sale of sales) {
            // Group by DD/MM/YYYY
            const dateStr = sale.createdAt.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
            trendingMap.set(dateStr, (trendingMap.get(dateStr) || 0) + sale.total);
        }

        const trendingSales = Array.from(trendingMap.entries()).map(([date, total]) => ({
            date,
            total
        }));

        return {
            success: true,
            kpis: {
                totalRevenue,
                totalSalesCount: sales.length,
                ticketPromedio: sales.length > 0 ? (totalRevenue / sales.length) : 0,
            },
            paymentBreakdown: {
                cash: cashTotal,
                card: cardTotal,
                online: onlineTotal,
            },
            trafficLight: {
                status: trafficLight, // green, yellow, red, gray
                selectedAverage: selectedPeriodDailyAverage,
                historicalAverage: averageDailyRevenue
            },
            charts: {
                trendingSales,
                categorySales
            }
        }

    } catch (error: any) {
        console.error("Error fetching sales analytics:", error);
        return { success: false, error: error.message };
    }
}

// History List for the DataTable
export async function getSalesHistoryList(filters: AnalyticsFilters = {}) {
    const { startDate, endDate, shiftId } = filters;

    const where: any = {};
    if (shiftId) {
        where.shiftId = shiftId;
    } else if (startDate && endDate) {
        where.createdAt = {
            gte: startOfDay(startDate),
            lte: endOfDay(endDate)
        };
    }

    try {
        const sales = await prisma.sale.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                shift: {
                    include: { user: true }
                },
                payments: true
            }
        });

        return sales.map(sale => ({
            id: sale.id,
            shortId: sale.id.substring(0, 8).toUpperCase(), // Fake Invoice Number
            createdAt: sale.createdAt.toISOString(),
            total: sale.total,
            status: sale.status,
            sellerName: sale.shift?.user?.name || "Desconocido",
            shiftId: sale.shiftId,
            payments: sale.payments.map((p: any) => p.method).join(", ")
        }));

    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getSaleForPrint(saleId: string) {
    try {
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                details: {
                    include: { product: true }
                },
                payments: true
            }
        });

        if (!sale) return { success: false, error: "Factura no encontrada" };

        return {
            success: true,
            sale: {
                ...sale,
                createdAt: sale.createdAt.toISOString(),
                updatedAt: sale.updatedAt.toISOString(),
                details: sale.details.map(d => ({
                    ...d,
                    createdAt: d.createdAt.toISOString()
                }))
            }
        };
    } catch (err: any) {
        console.error(err);
        return { success: false, error: err.message };
    }
}
