"use server";

import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { differenceInDays } from "date-fns";
import { startOfBusinessDay as startOfDay, endOfBusinessDay as endOfDay, businessDayKey, businessDayLabel } from "@/app/lib/time";
import { requirePermission } from "@/lib/auth";
import { toUserMessage } from "@/lib/result";

interface AnalyticsFilters {
    startDate?: Date;
    endDate?: Date;
    shiftId?: string;
}

export async function getSalesAnalytics(filters: AnalyticsFilters = {}) {
    await requirePermission("VIEW_REPORTS");
    const { startDate, endDate, shiftId } = filters;

    // Date range for query
    const where: Prisma.SaleWhereInput = {
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
        const trendingMap = new Map<string, { label: string; total: number }>();
        for (const sale of sales) {
            const key = businessDayKey(sale.createdAt);
            const entry = trendingMap.get(key) ?? { label: businessDayLabel(sale.createdAt), total: 0 };
            entry.total += sale.total;
            trendingMap.set(key, entry);
        }

        const trendingSales = Array.from(trendingMap.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, { label, total }]) => ({ date: label, total }));

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

    } catch (error: unknown) {
        console.error("Error fetching sales analytics:", error);
        return { success: false, error: toUserMessage(error, "No se pudieron cargar las analíticas.") };
    }
}

// History List for the DataTable
export async function getSalesHistoryList(filters: AnalyticsFilters = {}) {
    await requirePermission("VIEW_REPORTS");
    const { startDate, endDate, shiftId } = filters;

    const where: Prisma.SaleWhereInput = {};
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
                    include: { user: true, register: true }
                },
                payments: true
            }
        });

        return sales.map(sale => ({
            id: sale.id,
            shortId: sale.number != null
                ? `${sale.shift?.register?.prefix ? sale.shift.register.prefix + "-" : ""}${sale.number}`
                : sale.id.substring(0, 8).toUpperCase(),
            number: sale.number,
            cancelReason: sale.cancelReason,
            createdAt: sale.createdAt.toISOString(),
            total: sale.total,
            status: sale.status,
            sellerName: sale.shift?.user?.name || "Desconocido",
            shiftId: sale.shiftId,
            payments: sale.payments.map((p) => p.method).join(", ")
        }));

    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function getSaleForPrint(saleId: string) {
    try {
        await requirePermission("VIEW_REPORTS");
        const sale = await prisma.sale.findUnique({
            where: { id: saleId },
            include: {
                details: {
                    include: { product: true }
                },
                payments: true,
                shift: { include: { register: true } },
                customer: true,
            }
        });

        if (!sale) return { success: false, error: "Comprobante no encontrado" };

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
    } catch (err: unknown) {
        console.error(err);
        return { success: false, error: toUserMessage(err, "No se pudo cargar el comprobante.") };
    }
}

// ─── Product ranking & profitability ────────────────────────────────────────

export interface ProductRankingRow {
    productId: string;
    productName: string;
    productCode: string;
    quantitySold: number;
    revenue: number;
    /** quantitySold * Product.cost (today's cost, not a historical snapshot
     * — SaleDetail doesn't store cost-at-sale-time, only unitPrice). Good
     * enough for "which products are worth pushing", not exact accounting. */
    estimatedCost: number;
    margin: number;
    marginPercent: number;
}

/** Full product ranking (no top-5 cap) with an estimated margin per
 * product, for an arbitrary date range or a specific shift. */
export async function getProductRankingReport(filters: AnalyticsFilters = {}) {
    await requirePermission("VIEW_REPORTS");
    const { startDate, endDate, shiftId } = filters;

    const where: Prisma.SaleDetailWhereInput = {
        sale: {
            status: "COMPLETED",
            ...(shiftId ? { shiftId } : startDate && endDate ? { createdAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) } } : {}),
        },
    };

    try {
        const details = await prisma.saleDetail.findMany({
            where,
            select: { productId: true, quantity: true, subtotal: true, product: { select: { name: true, code: true, cost: true } } },
        });

        const map = new Map<string, ProductRankingRow>();
        for (const d of details) {
            const entry = map.get(d.productId) ?? {
                productId: d.productId,
                productName: d.product?.name ?? "Producto eliminado",
                productCode: d.product?.code ?? "",
                quantitySold: 0, revenue: 0, estimatedCost: 0, margin: 0, marginPercent: 0,
            };
            entry.quantitySold += d.quantity;
            entry.revenue += d.subtotal;
            entry.estimatedCost += (d.product?.cost ?? 0) * d.quantity;
            map.set(d.productId, entry);
        }

        const rows = Array.from(map.values())
            .map((r) => {
                const margin = r.revenue - r.estimatedCost;
                return { ...r, margin, marginPercent: r.revenue > 0 ? (margin / r.revenue) * 100 : 0 };
            })
            .sort((a, b) => b.quantitySold - a.quantitySold);

        return { success: true, rows };
    } catch (error: unknown) {
        console.error("Error building product ranking report:", error);
        return { success: false, error: toUserMessage(error, "No se pudo generar el reporte.") };
    }
}

// ─── Promotion usage ─────────────────────────────────────────────────────────

export interface PromotionUsageRow {
    promotionId: string;
    promotionName: string;
    timesUsed: number;
    totalDiscount: number;
    totalRevenue: number;
}

/** How much each promotion has actually been used and discounted, for an
 * arbitrary date range or a specific shift — is it earning its keep? */
export async function getPromotionUsageReport(filters: AnalyticsFilters = {}) {
    await requirePermission("VIEW_REPORTS");
    const { startDate, endDate, shiftId } = filters;

    const where: Prisma.SaleWhereInput = {
        status: "COMPLETED",
        promotionId: { not: null },
        ...(shiftId ? { shiftId } : startDate && endDate ? { createdAt: { gte: startOfDay(startDate), lte: endOfDay(endDate) } } : {}),
    };

    try {
        const sales = await prisma.sale.findMany({ where, select: { promotionId: true, promotionName: true, discount: true, total: true } });

        const map = new Map<string, PromotionUsageRow>();
        for (const s of sales) {
            if (!s.promotionId) continue;
            const entry = map.get(s.promotionId) ?? {
                promotionId: s.promotionId, promotionName: s.promotionName ?? "Promoción eliminada",
                timesUsed: 0, totalDiscount: 0, totalRevenue: 0,
            };
            entry.timesUsed += 1;
            entry.totalDiscount += s.discount;
            entry.totalRevenue += s.total;
            map.set(s.promotionId, entry);
        }

        const rows = Array.from(map.values()).sort((a, b) => b.timesUsed - a.timesUsed);
        return { success: true, rows };
    } catch (error: unknown) {
        console.error("Error building promotion usage report:", error);
        return { success: false, error: toUserMessage(error, "No se pudo generar el reporte.") };
    }
}
