import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, requireSession } from "@/lib/auth";
import { toCsv, csvResponse } from "@/app/lib/csv";
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
 * GET /api/export/{sales|sales-detail|inventory|shift}?from=YYYY-MM-DD&to=YYYY-MM-DD&id=...
 * Returns a CSV that opens correctly in Excel (UTF-8 BOM, ';' separator).
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

            // One row per product line, same as before — but "Pagos" used to
            // cram every payment of the sale into a single cell
            // ("Efectivo 2.000 | Tarjeta 1.400 | ...") repeated on every
            // line. That was fine when a sale had 2-3 payments; a split
            // bill can have a dozen (one per person per method), and the
            // cell became an unreadable blob in Excel. Sum by method
            // instead — same shape the "sales" export already uses — and
            // flag split sales separately rather than trying to cram the
            // per-person detail into this row-per-product-line grain.
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
            const cash = shift.sales.filter((s) => s.status === "COMPLETED").flatMap((s) => s.payments).filter((p) => p.method === "CASH").reduce((a, p) => a + p.amount, 0);
            rows.push([]);
            rows.push(["Turno", shift.id, "Caja", shift.register.name, "Cajero", shift.user.name]);
            rows.push(["Apertura", fmtDate(shift.startTime), "Cierre", shift.endTime ? fmtDate(shift.endTime) : "", "Base", shift.baseAmount]);
            rows.push(["Efectivo vendido", cash, "Esperado en caja", shift.baseAmount + cash, "Contado", shift.closeAmount ?? ""]);

            const csv = toCsv(
                ["Fecha", "Comprobante", "Estado", "Código", "Producto", "Cantidad", "Precio unit.", "Base", "IVA", "ICA", "Impoconsumo", "Total línea", "Efectivo", "Tarjeta", "Transferencia", "Cuenta dividida"],
                rows
            );
            return csvResponse(`turno_${businessDayKey(shift.startTime)}_${shift.register.name.replace(/\s+/g, "_")}.csv`, csv);
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
            const csv = toCsv(
                ["Fecha", "Código", "Producto", "Tipo", "Cantidad", "Stock después", "Costo unit.", "Motivo"],
                rows.map((r) => [fmtDate(r.createdAt), r.product.code, r.product.name, TYPE[r.type] ?? r.type, r.quantity, r.stockAfter, r.unitCost ?? "", r.reason ?? ""])
            );
            return csvResponse(`movimientos_${tag}.csv`, csv);
        }

        if (kind === "inventory") {
            const products = await prisma.product.findMany({ include: { category: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] });
            const csv = toCsv(
                ["Código", "Nombre", "Categoría", "Stock", "Costo", "Precio", "IVA %", "ICA %", "Impoconsumo %", "Activo", "Favorito", "Valor inventario (costo)"],
                products.map((p) => [p.code, p.name, p.category?.name ?? "", p.stock, p.cost, p.price, p.taxIva, p.taxIca, p.taxImpoConsumo, p.isActive ? "Sí" : "No", p.isFavorite ? "Sí" : "No", Math.round(p.stock * p.cost)])
            );
            return csvResponse(`inventario_${businessDayKey(new Date())}.csv`, csv);
        }

        const { start, end, tag } = parseRange(req);
        const sales = await prisma.sale.findMany({
            where: { createdAt: { gte: start, lte: end } },
            include: { details: true, payments: true, customer: true, shift: { include: { user: true, register: true } } },
            orderBy: { createdAt: "asc" },
        });

        if (kind === "sales") {
            const csv = toCsv(
                ["Fecha", "Comprobante", "Estado", "Caja", "Cajero", "Cliente", "Total", "Efectivo", "Tarjeta", "Transferencia", "Motivo anulación"],
                sales.map((s) => {
                    const by = (m: string) => s.payments.filter((p) => p.method === m).reduce((a, p) => a + p.amount, 0);
                    return [fmtDate(s.createdAt), receiptNo(s), STATUS[s.status] ?? s.status, s.shift.register.name, s.shift.user.name, s.customer?.fullName ?? "", s.total, by("CASH"), by("CARD"), by("TRANSFER"), s.cancelReason ?? ""];
                })
            );
            return csvResponse(`ventas_${tag}.csv`, csv);
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
            const csv = toCsv(["Fecha", "Comprobante", "Estado", "Caja", "Cajero", "Código", "Producto", "Cantidad", "Precio unit.", "Base", "IVA", "ICA", "Impoconsumo", "Total línea"], rows);
            return csvResponse(`ventas_detalle_${tag}.csv`, csv);
        }

        return new Response("Tipo de exportación desconocido", { status: 404 });
    } catch (err) {
        const e = err as { name?: string; message?: string };
        if (e?.name === "AuthError") return new Response(e.message ?? "No autenticado", { status: 401 });
        console.error("[export]", err);
        return new Response("Error generando el archivo", { status: 500 });
    }
}
