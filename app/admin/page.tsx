import { getDashboardData } from "@/app/actions/dashboard";
import { formatMoney } from "@/app/lib/money";
import { SalesHourChart } from "./components/SalesHourChart";
import { LowStockPanel } from "./inventory/components/LowStockPanel";
import {
    TrendingUp,
    ShoppingCart,
    Monitor,
    AlertTriangle,
    Package,
    Clock,
} from "lucide-react";

export const metadata = {
    title: "Oneiros Admin | Resumen",
};

const METHOD_LABELS: Record<string, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
};

export default async function AdminDashboardPage() {
    const data = await getDashboardData();
    const { kpis, hourlySales, topProducts, recentSales, lowStockProducts } = data;

    const maxQty = topProducts[0]?.totalQty ?? 1;

    return (
        <div className="space-y-8">
            {/* Header */}
            <header>
                <h1 className="text-4xl font-black text-foreground tracking-tight">
                    Resumen Ejecutivo
                </h1>
                <p className="text-muted-foreground mt-1 text-base">
                    Visión general del estado financiero y operativo del negocio.
                </p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Ventas de hoy */}
                <div className="bg-card rounded-3xl border border-border shadow-sm p-6 flex flex-col justify-between min-h-[150px] transition-transform hover:scale-[1.02]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm font-semibold">Ventas de Hoy</p>
                            <p className="text-3xl font-black tracking-tight text-foreground mt-2">
                                {formatMoney(kpis.todaySales)}
                            </p>
                        </div>
                        <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0">
                            <TrendingUp className="w-5 h-5" />
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-4">
                        Acumulado desde las 00:00
                    </p>
                </div>

                {/* Transacciones */}
                <div className="bg-card rounded-3xl border border-border shadow-sm p-6 flex flex-col justify-between min-h-[150px] transition-transform hover:scale-[1.02]">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm font-semibold">Transacciones Hoy</p>
                            <p className="text-3xl font-black tracking-tight text-foreground mt-2">
                                {kpis.todayTransactions}
                            </p>
                        </div>
                        <span className="p-2 bg-blue-500/10 rounded-xl text-blue-500 shrink-0">
                            <ShoppingCart className="w-5 h-5" />
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-4">
                        Ventas completadas hoy
                    </p>
                </div>

                {/* Turno activo */}
                <div
                    className={`rounded-3xl border shadow-sm p-6 flex flex-col justify-between min-h-[150px] transition-transform hover:scale-[1.02] ${
                        kpis.activeShiftRegister
                            ? "bg-card border-border"
                            : "bg-amber-500/5 border-amber-500/20"
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm font-semibold">Turno Activo</p>
                            <p
                                className={`text-xl font-black tracking-tight mt-2 leading-tight ${
                                    kpis.activeShiftRegister
                                        ? "text-foreground"
                                        : "text-amber-500"
                                }`}
                            >
                                {kpis.activeShiftRegister ?? "Sin turno"}
                            </p>
                        </div>
                        <span
                            className={`p-2 rounded-xl shrink-0 ${
                                kpis.activeShiftRegister
                                    ? "bg-violet-500/10 text-violet-500"
                                    : "bg-amber-500/10 text-amber-500"
                            }`}
                        >
                            <Monitor className="w-5 h-5" />
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-4">
                        {kpis.activeShiftRegister ? "Caja actualmente abierta" : "No hay caja abierta"}
                    </p>
                </div>

                {/* Bajo stock */}
                <div
                    className={`rounded-3xl border shadow-sm p-6 flex flex-col justify-between min-h-[150px] transition-transform hover:scale-[1.02] ${
                        kpis.lowStockCount > 0
                            ? "bg-rose-500/5 border-rose-500/20"
                            : "bg-card border-border"
                    }`}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-muted-foreground text-sm font-semibold">Bajo Stock</p>
                            <p
                                className={`text-3xl font-black tracking-tight mt-2 ${
                                    kpis.lowStockCount > 0
                                        ? "text-rose-500"
                                        : "text-foreground"
                                }`}
                            >
                                {kpis.lowStockCount}
                            </p>
                        </div>
                        <span
                            className={`p-2 rounded-xl shrink-0 ${
                                kpis.lowStockCount > 0
                                    ? "bg-rose-500/10 text-rose-500"
                                    : "bg-muted text-muted-foreground"
                            }`}
                        >
                            <AlertTriangle className="w-5 h-5" />
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mt-4">
                        Productos con stock &lt; 5 unidades
                    </p>
                </div>
            </div>

            {/* Hourly Sales Chart */}
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-lg font-bold tracking-tight">Ventas por Hora</h2>
                    <span className="ml-auto text-xs text-muted-foreground font-medium">Últimas 24 horas</span>
                </div>
                <SalesHourChart data={hourlySales} />
            </div>

            {/* Low stock alert panel */}
            {kpis.lowStockCount > 0 && (
                <div>
                    <h2 className="text-lg font-bold tracking-tight mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Alertas de Stock
                    </h2>
                    <LowStockPanel products={lowStockProducts} />
                </div>
            )}

            {/* Bottom row: Top Products + Recent Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 5 Products */}
                <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Package className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-lg font-bold tracking-tight">Top 5 Productos Hoy</h2>
                    </div>

                    {topProducts.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">
                            Sin ventas registradas hoy.
                        </p>
                    ) : (
                        <ol className="space-y-4">
                            {topProducts.map((p, i) => {
                                const pct = Math.round((p.totalQty / maxQty) * 100);
                                return (
                                    <li key={p.productId} className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs font-black text-muted-foreground w-4 shrink-0">
                                                    {i + 1}
                                                </span>
                                                <span className="text-sm font-semibold truncate">{p.name}</span>
                                            </div>
                                            <span className="text-sm font-black tabular-nums shrink-0 ml-2">
                                                {p.totalQty % 1 === 0
                                                    ? p.totalQty
                                                    : p.totalQty.toFixed(1)}{" "}
                                                uds
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5">
                                            <div
                                                className="h-1.5 rounded-full bg-emerald-500 transition-all"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>

                {/* Recent Sales */}
                <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                        <h2 className="text-lg font-bold tracking-tight">Últimas Ventas</h2>
                    </div>

                    {recentSales.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-center py-8">
                            Sin ventas registradas.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {recentSales.map((sale) => (
                                <div
                                    key={sale.id}
                                    className="flex items-center justify-between py-3 border-b border-border last:border-0"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                            <ShoppingCart className="w-4 h-4 text-primary" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold">
                                                {sale.mainPaymentMethod
                                                    ? METHOD_LABELS[sale.mainPaymentMethod] ?? sale.mainPaymentMethod
                                                    : "Sin pago"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{sale.time}</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black tabular-nums shrink-0 ml-2">
                                        {formatMoney(sale.total)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
