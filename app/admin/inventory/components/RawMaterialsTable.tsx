"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, PackagePlus, CheckCircle2, X, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    createRawMaterial, receiveRawMaterialLot, markRawMaterialLotDepleted,
    getRawMaterialConsumptionReport, type RawMaterialRow, type RawMaterialConsumptionLot,
} from "@/app/actions/lots";
import type { SupplierRow } from "@/app/actions/suppliers";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatMoney } from "@/app/lib/money";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota" });

function NewMaterialForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await createRawMaterial(name);
        setLoading(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success(`Insumo "${name}" creado.`);
        setName("");
        router.refresh();
    };

    return (
        <form onSubmit={submit} className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nuevo insumo, ej. Café en grano" className="h-11 rounded-xl bg-muted/50 max-w-xs" />
            <Button type="submit" disabled={loading || !name.trim()} className="h-11 rounded-xl font-bold shrink-0">Crear insumo</Button>
        </form>
    );
}

function OpenLotForm({ materialId, suppliers, onDone }: { materialId: string; suppliers: SupplierRow[]; onDone: () => void }) {
    const router = useRouter();
    const [lotNumber, setLotNumber] = useState("");
    const [expirationDate, setExpirationDate] = useState("");
    const [supplierId, setSupplierId] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await receiveRawMaterialLot({
            rawMaterialId: materialId, lotNumber: lotNumber.trim() || undefined,
            expirationDate: expirationDate || null, supplierId: supplierId || null,
        });
        setLoading(false);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success("Lote registrado.");
        onDone();
        router.refresh();
    };

    return (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2 bg-muted/40 rounded-xl p-3 border border-border/50 mt-2">
            <div className="space-y-1">
                <label className="text-xs font-semibold ml-1">Lote</label>
                <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Opcional" className="h-9 rounded-lg bg-background w-32" />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-semibold ml-1">Vencimiento</label>
                <Input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} className="h-9 rounded-lg bg-background" />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-semibold ml-1">Proveedor</label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-9 rounded-lg bg-background border border-input text-sm px-2">
                    <option value="">Sin especificar</option>
                    {suppliers.filter((s) => s.isActive).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>
            <Button type="submit" size="sm" disabled={loading} className="h-9 rounded-lg font-bold">Registrar</Button>
            <Button type="button" size="sm" variant="ghost" onClick={onDone} className="h-9 rounded-lg">Cancelar</Button>
        </form>
    );
}

function ConsumptionReportModal({ materialId, materialName, onClose }: { materialId: string; materialName: string; onClose: () => void }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lots, setLots] = useState<RawMaterialConsumptionLot[]>([]);

    useEffect(() => {
        getRawMaterialConsumptionReport(materialId).then((res) => {
            if (!res.ok) { setError(res.error); return; }
            setLots(res.data);
        }).finally(() => setLoading(false));
    }, [materialId]);

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Consumo de &quot;{materialName}&quot;</DialogTitle>
                    <DialogDescription>Qué se vendió mientras duró cada lote de este insumo.</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculando...</div>
                ) : error ? (
                    <p className="text-destructive text-sm py-4">{error}</p>
                ) : lots.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4">
                        Ningún producto está marcado como hecho con este insumo todavía — configúralo en el formulario de producto, campo &quot;Insumo consumido&quot;.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {lots.map((lot) => (
                            <div key={lot.lotId} className="border border-border rounded-2xl p-4">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="font-semibold text-sm">
                                        {lot.lotNumber ? `Lote ${lot.lotNumber}` : "Sin número de lote"}
                                    </span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lot.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                                        {lot.status === "ACTIVE" ? "En uso" : "Agotado"}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mb-3">
                                    {fmtDate(lot.startDate)} — {lot.endDate ? fmtDate(lot.endDate) : "hoy"}
                                </p>
                                {lot.byProduct.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">Nada vendido en esta ventana.</p>
                                ) : (
                                    <>
                                        <ul className="space-y-1 mb-2">
                                            {lot.byProduct.map((p) => (
                                                <li key={p.productId} className="flex justify-between text-sm">
                                                    <span>{p.productName}</span>
                                                    <span className="font-mono text-muted-foreground">{p.quantitySold} · {formatMoney(p.revenue)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                        <p className="text-xs font-semibold text-right border-t border-border/50 pt-2">
                                            Total: {lot.totalQuantitySold} unidades · {formatMoney(lot.totalRevenue)} · {lot.saleCount} venta{lot.saleCount === 1 ? "" : "s"}
                                        </p>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export function RawMaterialsTable({ materials, suppliers }: { materials: RawMaterialRow[]; suppliers: SupplierRow[] }) {
    const router = useRouter();
    const [openingFor, setOpeningFor] = useState<string | null>(null);
    const [reportFor, setReportFor] = useState<{ id: string; name: string } | null>(null);

    const deplete = async (lotId: string) => {
        const res = await markRawMaterialLotDepleted(lotId);
        if (!res.ok) { toast.error(res.error); return; }
        toast.success("Marcado como agotado.");
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-sm text-muted-foreground mb-2">
                    Bitácora de insumos a granel (café, mezcla de helado) que no se cuentan por unidad vendida —
                    solo se registra el lote/vencimiento de lo que está actualmente en uso, para trazabilidad sanitaria.
                </p>
                <NewMaterialForm />
            </div>

            {materials.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">Sin insumos registrados todavía.</p>
            ) : (
                <ul className="space-y-3">
                    {materials.map((m) => (
                        <li key={m.id} className="bg-card border border-border rounded-2xl p-4">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FlaskConical className="w-4 h-4 text-primary shrink-0" />
                                    <span className="font-semibold truncate">{m.name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {m.activeLot ? (
                                        <>
                                            <span className="text-xs bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> En uso
                                            </span>
                                            <Button size="sm" variant="ghost" onClick={() => deplete(m.activeLot!.id)} className="h-8 text-xs" title="Se acabó y todavía no hay reemplazo">
                                                <X className="w-3.5 h-3.5 mr-1" /> Marcar agotado
                                            </Button>
                                        </>
                                    ) : (
                                        <span className="text-xs bg-muted text-muted-foreground font-semibold px-2.5 py-1 rounded-full">Agotado</span>
                                    )}
                                    <Button size="sm" variant="outline" onClick={() => setOpeningFor(m.id)} className="h-8 text-xs">
                                        <PackagePlus className="w-3.5 h-3.5 mr-1" /> {m.activeLot ? "Abrir lote nuevo" : "Registrar lote"}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setReportFor({ id: m.id, name: m.name })} className="h-8 text-xs">
                                        <BarChart3 className="w-3.5 h-3.5 mr-1" /> Ver consumo
                                    </Button>
                                </div>
                            </div>
                            {m.activeLot && (
                                <p className="text-xs text-muted-foreground font-mono mt-1 ml-6">
                                    {m.activeLot.lotNumber ? `Lote ${m.activeLot.lotNumber}` : "Sin número de lote"}
                                    {" · "}Abierto {fmtDate(m.activeLot.receivedDate)}
                                    {m.activeLot.expirationDate && ` · Vence ${fmtDate(m.activeLot.expirationDate)}`}
                                    {m.activeLot.supplierName && ` · ${m.activeLot.supplierName}`}
                                </p>
                            )}
                            {openingFor === m.id && <OpenLotForm materialId={m.id} suppliers={suppliers} onDone={() => setOpeningFor(null)} />}
                        </li>
                    ))}
                </ul>
            )}
            {reportFor && (
                <ConsumptionReportModal materialId={reportFor.id} materialName={reportFor.name} onClose={() => setReportFor(null)} />
            )}
        </div>
    );
}
