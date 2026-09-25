import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, requireSession, requirePermission } from "@/lib/auth";
import { buildXlsx, buildWorkbook, xlsxResponse } from "@/app/lib/xlsx";
import { getProductRankingReport, getPromotionUsageReport, getShiftsReport } from "@/app/actions/report";
import { startOfBusinessDay, endOfBusinessDay, BUSINESS_TZ, businessDayKey } from "@/app/lib/time";

const STATUS: Record<string, string> = { COMPLETED: "Completada", CANCELLED: "Anulada", SUSPENDED: "Suspendida" };
const fmtDate = (d: Date) => d.toLocaleString("es-CO", { timeZone: BUSINESS_TZ, hour12: false });
const receiptNo = (s: { number: number | null; id: string; shift?: { register?: { prefix: string | null } | null } | null }) =>
    s.number == null ? s.id.slice(0, 8).toUpperCase() : s.shift?.register?.prefix ? `${s.shift.register.prefix}-${s.number}` : String(s.number);

function parseRange(req: NextRequest) {
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const start = from ? startOfBusinessDay(new Date(from + "T12:00:00-05:00")) : startOfBusinessDay(new Date(Date.now() - 30 * 86400000));
    const end = to ? endOfBusinessDay(new Date(to + "T12:00:00-05:00")) : endOfBusinessDay(new Date());
    return { start, end, tag: `${businessDayKey(start)}_${businessDayKey(end)}` };
}

/**
 * GET /api/export/{sales|sales-detail|inventory|movements|shifts|shift|product-ranking|promotion-usage}?from=YYYY-MM-DD&to=YYYY-MM-DD&id=...
 * Every kind returns a styled .xlsx workbook (see app/lib/xlsx.ts) — `shift`
 * additionally requires `id` (single-shift Z-report); the rest read the
 * `from`/`to` date range.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
    const { kind } = await ctx.params;
    try {
        if (kind === "shift") {
            const user = await requireSession();
            const id = req.nextUrl.searchParams.get("id");
            if (!id) return new Response("Falta id", { status: 400 });
            const shift = await prisma.shift.findUnique({
                where: { id },
                include: { register: true, user: true, sales: { include: { details: true, payments: true }, orderBy: { createdAt: "asc" } } },
            });
            if (!shift) return new Response("Turno no encontrado", { status: 404 });
            if (shift.userId !== user.id && user.role !== "ADMIN") return new Response("Sin permiso", { status: 403 });

            // Sheet "Ventas": one row per product line. Payments are summed
            // per method into their own numeric columns (a split bill can
            // have a dozen payments — crammed into one text cell it became an
            // unreadable blob), with split sales flagged separately.
            const rows: (string | number | null)[][] = [];
            for (const s of shift.sales) {
                const isSplit = s.payments.some((p) => p.subAccountLabel);
                const by = (m: string) => s.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
                for (const d of s.details) {
                    rows.push([
                        fmtDate(s.createdAt), receiptNo({ ...s, shift }), STATUS[s.status] ?? s.status,
                        d.productCode, d.productName, d.quantity, d.unitPrice,
                        d.unitPrice * d.quantity, d.taxIvaAmount, d.taxIcaAmount, d.taxImpoConsumoAmount, d.subtotal,
                        by("CASH"), by("CARD"), by("TRANSFER"), isSplit ? "Sí" : "No",
                    ]);
                }
            }

            // Sheet "Resumen": the cuadre per method + shift facts.
            const completed = shift.sales.filter((s) => s.status === "COMPLETED");
            const sumMethod = (m: string) => completed.flatMap((s) => s.payments).filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
            const cashSales = sumMethod("CASH"), cardSales = sumMethod("CARD"), transferSales = sumMethod("TRANSFER");
            // The cashier declares cash separate from the base (which stays in
            // the drawer) — same reasoning as closeShift() in app/actions/shift.ts.
            const expectedCash = cashSales;
            // Shifts closed before the breakdown existed only have the cash count.
            const diff = (declared: number | null, expected: number) => (declared == null ? "" : declared - expected);
            const declaredTotal = shift.closeAmount == null ? null : shift.closeAmount + (shift.closeCard ?? 0) + (shift.closeTransfer ?? 0);
            const summaryRows: (string | number | null)[][] = [
                ["Efectivo (ventas, sin la base)", expectedCash, shift.closeAmount ?? "", diff(shift.closeAmount, expectedCash)],
                ["Tarjeta / Datáfono", cardSales, shift.closeCard ?? "", diff(shift.closeCard, cardSales)],
                ["Transferencias", transferSales, shift.closeTransfer ?? "", diff(shift.closeTransfer, transferSales)],
                ["Total", expectedCash + cardSales + transferSales, declaredTotal ?? "", diff(declaredTotal, expectedCash + cardSales + transferSales)],
                [],
                ["Turno", shift.id],
                ["Caja", shift.register.name],
                ["Cajero", shift.user.name],
                ["Apertura", fmtDate(shift.startTime)],
                ["Cierre", shift.endTime ? fmtDate(shift.endTime) : ""],
                ["Base de apertura", shift.baseAmount],
                ["Total vendido", completed.reduce((a, s) => a + s.total, 0)],
                ["Transacciones", String(completed.length)], // text: column B is a money column
                ["Ventas anuladas", String(shift.sales.length - completed.length)],
                ["Motivo del descuadre", shift.closeNote ?? ""],
            ];

            const buffer = await buildWorkbook([
                { name: "Resumen", headers: ["Concepto", "Esperado$", "Contado$", "Diferencia$"], rows: summaryRows },
                {
                    name: "Ventas",
                    headers: ["Fecha", "Comprobante", "Estado", "Código", "Producto", "Cantidad", "Precio unit.$", "Base$", "IVA$", "ICA$", "Impoconsumo$", "Total línea$", "Efectivo$", "Tarjeta$", "Transferencia$", "Cuenta dividida"],
                    rows,
                },
            ]);
            return xlsxResponse(`turno_${businessDayKey(shift.startTime)}_${shift.register.name.replace(/\s+/g, "_")}.xlsx`, buffer);
        }

        // These two are real .xlsx (colors, currency formatting) instead of
        // CSV — the reports they back are meant to be read/skimmed, not just
        // dumped for a spreadsheet formula. Gated by VIEW_REPORTS (same as
        // the report actions themselves), not requireAdmin — a CASHIER
        // delegated report access can pull these too.
        if (kind === "product-ranking") {
            await requirePermission("VIEW_REPORTS");
            const { start, end, tag } = parseRange(req);
            const result = await getProductRankingReport({ startDate: start, endDate: end });
            if (!result.success || !result.rows) return new Response(result.error ?? "No se pudo generar el reporte.", { status: 500 });
            const buffer = await buildXlsx(
                "Ranking de productos",
                ["Código", "Producto", "Cantidad vendida", "Ingresos$", "Costo estimado$", "Margen$", "Margen %"],
                result.rows.map((r) => [r.productCode, r.productName, r.quantitySold, r.revenue, r.estimatedCost, r.margin, Number(r.marginPercent.toFixed(1))])
            );
            return xlsxResponse(`ranking_productos_${tag}.xlsx`, buffer);
        }

        if (kind === "promotion-usage") {
            await requirePermission("VIEW_REPORTS");
            const { start, end, tag } = parseRange(req);
            const result = await getPromotionUsageReport({ startDate: start, endDate: end });
            if (!result.success || !result.rows) return new Response(result.error ?? "No se pudo generar el reporte.", { status: 500 });
            const buffer = await buildXlsx(
                "Uso de promociones",
                ["Promoción", "Veces usada", "Descuento total$", "Ingresos de esas ventas$"],
                result.rows.map((r) => [r.promotionName, r.timesUsed, r.totalDiscount, r.totalRevenue])
            );
            return xlsxResponse(`uso_promociones_${tag}.xlsx`, buffer);
        }

        await requireAdmin();

        if (kind === "movements") {
            const { start, end, tag } = parseRange(req);
            const rows = await prisma.stockMovement.findMany({
                where: { createdAt: { gte: start, lte: end } },
                include: { product: { select: { name: true, code: true } } },
                orderBy: { createdAt: "asc" },
            });
            const TYPE: Record<string, string> = { SALE: "Venta", CANCEL: "Anulación", PURCHASE: "Entrada", WASTE: "Merma", ADJUSTMENT: "Ajuste", IMPORT: "Importación" };
            const buffer = await buildXlsx(
                "Movimientos",
                ["Fecha", "Código", "Producto", "Tipo", "Cantidad", "Stock después", "Costo unit.$", "Motivo"],
                rows.map((r) => [fmtDate(r.createdAt), r.product.code, r.product.name, TYPE[r.type] ?? r.type, r.quantity, r.stockAfter, r.unitCost ?? "", r.reason ?? ""])
            );
            return xlsxResponse(`movimientos_${tag}.xlsx`, buffer);
        }

        if (kind === "inventory") {
            const products = await prisma.product.findMany({ include: { category: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] });
            const buffer = await buildXlsx(
                "Inventario",
                ["Código", "Nombre", "Categoría", "Stock", "Costo$", "Precio$", "IVA %", "ICA %", "Impoconsumo %", "Activo", "Favorito", "Valor inventario (costo)$"],
                products.map((p) => [p.code, p.name, p.category?.name ?? "", p.stock, p.cost, p.price, p.taxIva, p.taxIca, p.taxImpoConsumo, p.isActive ? "Sí" : "No", p.isFavorite ? "Sí" : "No", Math.round(p.stock * p.cost)])
            );
            return xlsxResponse(`inventario_${businessDayKey(new Date())}.xlsx`, buffer);
        }

        if (kind === "shifts") {
            const { start, end, tag } = parseRange(req);
            const result = await getShiftsReport({ startDate: start, endDate: end });
            if (!result.success) return new Response(result.error, { status: 500 });
            const rows = result.rows.map((s) => [
                s.registerName, s.userName, fmtDate(new Date(s.startTime)), s.endTime ? fmtDate(new Date(s.endTime)) : "",
                s.status, s.baseAmount, s.transactionCount, s.totalSales,
                s.cashSales, s.cardSales, s.transferSales,
                s.declaredTotal ?? "", s.difference ?? "",
                s.note ?? "",
            ]);
            const buffer = await buildXlsx(
                "Turnos",
                ["Caja", "Cajero", "Apertura", "Cierre", "Estado", "Base$", "Transacciones", "Total vendido$", "Efectivo$", "Tarjeta$", "Transferencia$", "Total contado$", "Diferencia$", "Motivo descuadre"],
                rows
            );
            return xlsxResponse(`turnos_${tag}.xlsx`, buffer);
        }

        const { start, end, tag } = parseRange(req);
        const sales = await prisma.sale.findMany({
            where: { createdAt: { gte: start, lte: end } },
            include: { details: true, payments: true, customer: true, shift: { include: { user: true, register: true } } },
            orderBy: { createdAt: "asc" },
        });

        if (kind === "sales") {
            const buffer = await buildXlsx(
                "Ventas",
                ["Fecha", "Comprobante", "Estado", "Caja", "Cajero", "Cliente", "Total$", "Efectivo$", "Tarjeta$", "Transferencia$", "Motivo anulación"],
                sales.map((s) => {
                    const by = (m: string) => s.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
                    return [fmtDate(s.createdAt), receiptNo(s), STATUS[s.status] ?? s.status, s.shift.register.name, s.shift.user.name, s.customer?.fullName ?? "", s.total, by("CASH"), by("CARD"), by("TRANSFER"), s.cancelReason ?? ""];
                })
            );
            return xlsxResponse(`ventas_${tag}.xlsx`, buffer);
        }

        if (kind === "sales-detail") {
            const rows: (string | number | null)[][] = [];
            for (const s of sales) {
                for (const d of s.details) {
                    rows.push([
                        fmtDate(s.createdAt), receiptNo(s), STATUS[s.status] ?? s.status, s.shift.register.name, s.shift.user.name,
                        d.productCode, d.productName, d.quantity, d.unitPrice, d.unitPrice * d.quantity,
                        d.taxIvaAmount, d.taxIcaAmount, d.taxImpoConsumoAmount, d.subtotal,
                    ]);
                }
            }
            const buffer = await buildXlsx(
                "Ventas por producto",
                ["Fecha", "Comprobante", "Estado", "Caja", "Cajero", "Código", "Producto", "Cantidad", "Precio unit.$", "Base$", "IVA$", "ICA$", "Impoconsumo$", "Total línea$"],
                rows
            );
            return xlsxResponse(`ventas_detalle_${tag}.xlsx`, buffer);
        }

        return new Response("Tipo de exportación desconocido", { status: 404 });
    } catch (err) {
        const e = err as { name?: string; message?: string };
        if (e?.name === "AuthError") return new Response(e.message ?? "No autenticado", { status: 401 });
        console.error("[export]", err);
        return new Response("Error generando el archivo", { status: 500 });
    }
}
