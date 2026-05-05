"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { parseSiigoRows } from "@/app/lib/siigo-parser";
import { previewImport, importProducts } from "@/app/actions/import-products";
import type { PreviewRow, ImportResult } from "@/app/actions/import-products";
import { formatMoney } from "@/app/lib/money";
import { toast } from "sonner";
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    ArrowRight, ArrowLeft, Loader2, RefreshCw, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEPS = ["Cargar archivo", "Revisar cambios", "Resultado"];

function StepBar({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {STEPS.map((label, i) => (
                <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shrink-0 transition-colors ${
                        i < current ? "bg-emerald-500 text-white" :
                        i === current ? "bg-primary text-primary-foreground" :
                        "bg-muted text-muted-foreground"
                    }`}>
                        {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={`text-sm font-semibold ${i === current ? "text-foreground" : "text-muted-foreground"}`}>
                        {label}
                    </span>
                    {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 rounded-full mx-2 ${i < current ? "bg-emerald-500" : "bg-border"}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    new: { label: "Nuevo", className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
    update: { label: "Actualizar", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    unchanged: { label: "Sin cambios", className: "bg-muted text-muted-foreground border-border" },
} as const;

function StatusBadge({ status }: { status: PreviewRow["status"] }) {
    const { label, className } = STATUS_CONFIG[status];
    return (
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${className}`}>
            {label}
        </span>
    );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function ImportWizard() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [preview, setPreview] = useState<PreviewRow[]>([]);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [filterStatus, setFilterStatus] = useState<PreviewRow["status"] | "all">("all");

    const handleFile = useCallback(async (file: File) => {
        if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
            toast.error("Solo se aceptan archivos .xlsx o .xls de Siigo");
            return;
        }
        setLoading(true);
        setFileName(file.name);
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(buffer, { type: "array" });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
            const { rows, skipped } = parseSiigoRows(rawRows);

            if (rows.length === 0) {
                toast.error("No se encontraron productos válidos en el archivo.");
                setLoading(false);
                return;
            }

            const previewed = await previewImport(rows);
            setPreview(previewed);
            setStep(1);
            if (skipped > 0) toast.info(`${skipped} filas ignoradas (sin tipo "Producto" o sin código).`);
        } catch (err) {
            toast.error("Error al leer el archivo. Verifica que sea un exportado de Siigo.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }, [handleFile]);

    const handleConfirmImport = async () => {
        setLoading(true);
        try {
            const rowsToImport = preview.map(({ status: _s, existingId: _e, ...row }) => row);
            const res = await importProducts(rowsToImport);
            setResult(res);
            setStep(2);
            if (res.errors.length === 0) {
                toast.success(`Importación completada: ${res.created} nuevos, ${res.updated} actualizados.`);
            } else {
                toast.warning(`Importación con ${res.errors.length} errores.`);
            }
        } catch (err) {
            toast.error("Error durante la importación.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ── Preview stats ──
    const newCount = preview.filter(r => r.status === "new").length;
    const updateCount = preview.filter(r => r.status === "update").length;
    const unchangedCount = preview.filter(r => r.status === "unchanged").length;
    const visibleRows = filterStatus === "all" ? preview : preview.filter(r => r.status === filterStatus);

    // ── Step 0: Upload ──
    if (step === 0) return (
        <div className="space-y-6">
            <StepBar current={0} />
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-border rounded-3xl p-16 flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => document.getElementById("xlsx-input")?.click()}
            >
                <input
                    id="xlsx-input"
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {loading ? (
                    <Loader2 className="w-12 h-12 text-primary animate-spin" />
                ) : (
                    <FileSpreadsheet className="w-12 h-12 text-muted-foreground" />
                )}
                <div className="text-center">
                    <p className="text-lg font-bold text-foreground">
                        {loading ? "Procesando archivo..." : "Arrastra el archivo aquí"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        o haz clic para seleccionar — Solo exportaciones de Siigo (.xlsx)
                    </p>
                </div>
            </div>

            <div className="bg-muted/40 rounded-2xl p-4 border border-border text-sm text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Instrucciones
                </p>
                <p>1. En Siigo: <strong>Inventario → Productos y servicios → Exportar</strong></p>
                <p>2. Descarga el archivo <strong>.xlsx</strong> generado.</p>
                <p>3. Súbelo aquí — los productos existentes se actualizarán, los nuevos se crearán.</p>
            </div>
        </div>
    );

    // ── Step 1: Preview ──
    if (step === 1) return (
        <div className="space-y-6">
            <StepBar current={1} />

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Nuevos", count: newCount, color: "text-emerald-500", bg: "bg-emerald-500/10", status: "new" as const },
                    { label: "Actualizaciones", count: updateCount, color: "text-blue-500", bg: "bg-blue-500/10", status: "update" as const },
                    { label: "Sin cambios", count: unchangedCount, color: "text-muted-foreground", bg: "bg-muted/50", status: "unchanged" as const },
                ].map(({ label, count, color, bg, status }) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(filterStatus === status ? "all" : status)}
                        className={`rounded-2xl border p-4 text-left transition-all ${filterStatus === status ? "border-primary ring-1 ring-primary" : "border-border hover:border-primary/40"} ${bg}`}
                    >
                        <p className={`text-3xl font-black ${color}`}>{count}</p>
                        <p className="text-sm font-semibold text-muted-foreground mt-1">{label}</p>
                    </button>
                ))}
            </div>

            {/* File name + filter hint */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="font-medium truncate max-w-xs">{fileName}</span>
                    <span>— {preview.length} productos</span>
                </span>
                {filterStatus !== "all" && (
                    <button onClick={() => setFilterStatus("all")} className="text-primary font-semibold hover:underline flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Ver todos
                    </button>
                )}
            </div>

            {/* Preview table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                            <tr>
                                {["Estado", "Código", "Nombre", "Precio", "IVA", "Stock", "Activo"].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {visibleRows.map((row) => (
                                <tr key={row.code} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{row.code}</td>
                                    <td className="px-4 py-2.5 font-medium max-w-[200px] truncate">{row.name}</td>
                                    <td className="px-4 py-2.5 font-semibold">{formatMoney(row.price)}</td>
                                    <td className="px-4 py-2.5">{row.taxIva > 0 ? `${row.taxIva}%` : "—"}</td>
                                    <td className="px-4 py-2.5">{row.stock}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={`text-xs font-semibold ${row.isActive ? "text-emerald-500" : "text-muted-foreground"}`}>
                                            {row.isActive ? "Sí" : "No"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="rounded-xl gap-2">
                    <ArrowLeft className="w-4 h-4" /> Volver
                </Button>
                <Button
                    onClick={handleConfirmImport}
                    disabled={loading || (newCount + updateCount === 0)}
                    className="rounded-xl gap-2 font-bold px-8"
                >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    {loading ? "Importando..." : `Confirmar importación (${newCount + updateCount} cambios)`}
                </Button>
            </div>
        </div>
    );

    // ── Step 2: Result ──
    return (
        <div className="space-y-6">
            <StepBar current={2} />

            <div className={`rounded-3xl border p-8 text-center ${result?.errors.length === 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
                {result?.errors.length === 0
                    ? <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    : <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                }
                <h2 className="text-2xl font-black text-foreground mb-2">
                    {result?.errors.length === 0 ? "Importación completada" : "Importación con advertencias"}
                </h2>
                <p className="text-muted-foreground">
                    El inventario ha sido actualizado correctamente.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-card rounded-2xl border border-border p-6 text-center">
                    <p className="text-4xl font-black text-emerald-500">{result?.created}</p>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Productos creados</p>
                </div>
                <div className="bg-card rounded-2xl border border-border p-6 text-center">
                    <p className="text-4xl font-black text-blue-500">{result?.updated}</p>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Actualizados</p>
                </div>
                <div className="bg-card rounded-2xl border border-border p-6 text-center">
                    <p className="text-4xl font-black text-muted-foreground">{result?.unchanged}</p>
                    <p className="text-sm font-semibold text-muted-foreground mt-2">Sin cambios</p>
                </div>
            </div>

            {result && result.errors.length > 0 && (
                <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 space-y-2">
                    <p className="font-bold text-destructive text-sm">{result.errors.length} errores durante la importación:</p>
                    {result.errors.map((e, i) => (
                        <p key={i} className="text-xs font-mono text-destructive/80 bg-destructive/5 px-3 py-1 rounded-lg">{e}</p>
                    ))}
                </div>
            )}

            <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setStep(0); setPreview([]); setResult(null); setFileName(""); }} className="rounded-xl gap-2 flex-1">
                    <RefreshCw className="w-4 h-4" /> Nueva importación
                </Button>
                <Button onClick={() => router.push("/admin/inventory")} className="rounded-xl gap-2 flex-1 font-bold">
                    Ver inventario <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
