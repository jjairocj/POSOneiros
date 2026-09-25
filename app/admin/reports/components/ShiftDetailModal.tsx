"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingBag, Package } from "lucide-react";
import { formatMoney } from "@/app/lib/money";
import { getShiftDetail, type ShiftDetail } from "@/app/actions/report";

const METHOD_LABEL: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };

const fmtTime = (iso: string) => new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/** Drill-down opened from a Turnos report row: every sale in that shift, and
 * the products sold that day aggregated — so "¿qué se vendió en este turno?"
 * doesn't require cross-referencing the Histórico de Tickets by hand. */
export function ShiftDetailModal({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ShiftDetail | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getShiftDetail(shiftId).then((res) => {
            if (cancelled) return;
            if (!res.success) { setError(res.error); return; }
            setData(res.data);
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [shiftId]);

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle>{data ? `${data.registerName} · ${data.userName}` : "Detalle del turno"}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
                    </div>
                ) : error ? (
                    <p className="text-destructive text-sm py-6 text-center">{error}</p>
                ) : data && (
                    <Tabs defaultValue="sales">
                        <TabsList className="bg-muted/50 p-1 rounded-2xl w-full grid grid-cols-2">
                            <TabsTrigger value="sales" className="rounded-xl font-semibold flex items-center gap-1.5 data-[state=active]:font-bold">
                                <ShoppingBag className="w-4 h-4" /> Ventas ({data.sales.length})
                            </TabsTrigger>
                            <TabsTrigger value="products" className="rounded-xl font-semibold flex items-center gap-1.5 data-[state=active]:font-bold">
                                <Package className="w-4 h-4" /> Productos vendidos
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="sales" className="mt-5 outline-none">
                            {data.sales.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin ventas en este turno.</p>
                            ) : (
                                <div className="rounded-2xl border border-border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left">
                                                <th className="py-2 px-3 font-semibold">Factura</th>
                                                <th className="py-2 px-3 font-semibold">Hora</th>
                                                <th className="py-2 px-3 font-semibold">Estado</th>
                                                <th className="py-2 px-3 font-semibold">Método</th>
                                                <th className="py-2 px-3 font-semibold text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.sales.map((s) => (
                                                <tr key={s.id} className="border-t border-border/50">
                                                    <td className="py-2 px-3 font-mono font-bold">{s.shortId}</td>
                                                    <td className="py-2 px-3 text-muted-foreground">{fmtTime(s.createdAt)}</td>
                                                    <td className="py-2 px-3">
                                                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md uppercase ${s.status === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}`}>
                                                            {s.status === "CANCELLED" ? "Anulada" : "Completada"}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {s.payments.split(", ").filter(Boolean).map((m, i) => (
                                                                <span key={i} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase">
                                                                    {METHOD_LABEL[m] ?? m}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className={`py-2 px-3 text-right font-bold ${s.status === "CANCELLED" ? "line-through text-muted-foreground" : ""}`}>{formatMoney(s.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="products" className="mt-5 outline-none">
                            {data.products.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin productos vendidos en este turno.</p>
                            ) : (
                                <div className="rounded-2xl border border-border overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50">
                                            <tr className="text-left">
                                                <th className="py-2 px-3 font-semibold">Producto</th>
                                                <th className="py-2 px-3 font-semibold text-right">Cantidad</th>
                                                <th className="py-2 px-3 font-semibold text-right">Ingresos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.products.map((p) => (
                                                <tr key={p.productId} className="border-t border-border/50">
                                                    <td className="py-2 px-3">
                                                        <div className="font-medium">{p.productName}</div>
                                                        <div className="text-xs text-muted-foreground font-mono">{p.productCode}</div>
                                                    </td>
                                                    <td className="py-2 px-3 text-right font-bold">{p.quantitySold}</td>
                                                    <td className="py-2 px-3 text-right">{formatMoney(p.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
