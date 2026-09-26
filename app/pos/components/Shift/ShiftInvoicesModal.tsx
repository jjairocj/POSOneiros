"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, ChevronLeft, ChevronRight, Receipt as ReceiptIcon } from "lucide-react";
import { getShiftInvoicesPage, type ShiftInvoiceRow } from "@/app/actions/report";
import { ViewReceiptModal } from "@/app/admin/sales/components/ViewReceiptModal";

const money = (n: number) => `$${n.toLocaleString("es-CO")}`;

/** Cashier-facing, shift-scoped invoice list opened from the ShoppingBag
 * badge in ShiftHeader — lets whoever is running the register reprint a
 * ticket without going through /admin/sales (which requires VIEW_REPORTS). */
export default function ShiftInvoicesModal({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<ShiftInvoiceRow[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getShiftInvoicesPage(shiftId, page).then((res) => {
            if (cancelled) return;
            if (!res.success) { setError(res.error); return; }
            setRows(res.rows);
            setTotalCount(res.totalCount);
            setPageSize(res.pageSize);
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [shiftId, page]);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return (
        <>
            <Dialog open onOpenChange={(v) => !v && onClose()}>
                <DialogContent className="max-w-lg rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Facturas del turno</DialogTitle>
                    </DialogHeader>

                    {loading ? (
                        <div className="flex items-center justify-center py-16 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
                        </div>
                    ) : error ? (
                        <p className="text-destructive text-sm py-6 text-center">{error}</p>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                            <ReceiptIcon className="w-8 h-8 opacity-50" />
                            <p className="text-sm">Todavía no hay facturas en este turno.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto -mx-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-muted-foreground text-xs uppercase tracking-wide">
                                            <th className="px-2 py-2 font-semibold">Factura</th>
                                            <th className="px-2 py-2 font-semibold">Fecha y hora</th>
                                            <th className="px-2 py-2 font-semibold text-right">Valor</th>
                                            <th className="px-2 py-2 font-semibold text-right">&nbsp;</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.id} className="border-t border-border/60">
                                                <td className="px-2 py-2 font-mono">{row.shortId}</td>
                                                <td className="px-2 py-2 whitespace-nowrap">
                                                    {new Date(row.createdAt).toLocaleString("es-CO", {
                                                        day: "2-digit", month: "2-digit", year: "2-digit",
                                                        hour: "2-digit", minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="px-2 py-2 text-right font-semibold">{money(row.total)}</td>
                                                <td className="px-2 py-2 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="rounded-lg gap-1.5"
                                                        onClick={() => setPrintingSaleId(row.id)}
                                                    >
                                                        <Printer className="w-3.5 h-3.5" /> Reimprimir
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-2">
                                    <Button
                                        type="button" variant="outline" size="sm" className="rounded-lg"
                                        disabled={page <= 1}
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        Página {page} de {totalPages}
                                    </span>
                                    <Button
                                        type="button" variant="outline" size="sm" className="rounded-lg"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {printingSaleId && (
                <ViewReceiptModal
                    saleId={printingSaleId}
                    shortId={rows.find((r) => r.id === printingSaleId)?.shortId ?? ""}
                    canCancel={false}
                    onClose={() => setPrintingSaleId(null)}
                    onRequestCancel={() => {}}
                />
            )}
        </>
    );
}
