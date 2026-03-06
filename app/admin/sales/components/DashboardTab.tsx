"use client";

import React from "react";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, DollarSign, Wallet, CreditCard, MonitorSmartphone } from "lucide-react";

interface DashboardData {
    kpis: {
        totalRevenue: number;
        totalSalesCount: number;
        ticketPromedio: number;
    };
    paymentBreakdown: {
        cash: number;
        card: number;
        online: number;
    };
    trafficLight: {
        status: string;
        selectedAverage: number;
        historicalAverage: number;
    };
    charts: {
        trendingSales: { date: string, total: number }[];
        categorySales: { name: string, value: number }[];
    };
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function DashboardTab({ data }: { data: DashboardData }) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    const getTrafficLightClass = (status: string) => {
        switch (status) {
            case 'green': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
            case 'yellow': return 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400';
            case 'red': return 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400';
            default: return 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400';
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Traffic Light KPI */}
                <div className={`p-6 rounded-3xl border flex flex-col justify-between min-h-[160px] ${getTrafficLightClass(data.trafficLight.status)}`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold opacity-80 text-sm">Salud de Ventas (Semáforo)</p>
                            <h3 className="text-3xl font-black mt-2">
                                {data.trafficLight.status === 'green' ? 'Excelente' : 
                                 data.trafficLight.status === 'yellow' ? 'Estable' : 
                                 data.trafficLight.status === 'red' ? 'Bajo' : 'Sin Datos'}
                            </h3>
                        </div>
                        <Activity className="w-6 h-6 shrink-0" />
                    </div>
                    <div className="mt-4 text-xs font-semibold pt-4">
                        Promedio Histórico: {formatCurrency(data.trafficLight.historicalAverage)}/día
                    </div>
                </div>

                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-muted-foreground font-semibold text-sm">Ingresos Totales</p>
                            <h3 className="text-3xl font-black mt-2 tracking-tight text-foreground">
                                {formatCurrency(data.kpis.totalRevenue)}
                            </h3>
                        </div>
                        <div className="p-2 bg-primary/10 rounded-xl text-primary shrink-0"><DollarSign className="w-5 h-5" /></div>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground font-semibold pt-4">
                        {data.kpis.totalSalesCount} transacciones en el periodo
                    </div>
                </div>
                
                {/* Payment Methods Breakdown */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm col-span-1 lg:col-span-2 flex flex-col justify-center min-h-[160px]">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-muted-foreground font-semibold text-sm">Desglose de Ingresos</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                <Wallet className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Efectivo</span>
                            </div>
                            <span className="font-bold text-lg">{formatCurrency(data.paymentBreakdown.cash)}</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                <CreditCard className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Tarjeta</span>
                            </div>
                            <span className="font-bold text-lg">{formatCurrency(data.paymentBreakdown.card)}</span>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                <MonitorSmartphone className="w-4 h-4" /> <span className="text-xs font-bold uppercase">Línea</span>
                            </div>
                            <span className="font-bold text-lg">{formatCurrency(data.paymentBreakdown.online)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm lg:col-span-2 relative">
                    <h3 className="font-bold text-lg mb-6 tracking-tight">Tendencia de Ingresos</h3>
                    <div className="w-full relative min-h-[300px]" style={{ height: "300px" }}>
                        <ResponsiveContainer width="99%" minWidth={1} minHeight={1}>
                            <AreaChart data={data.charts.trendingSales} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis 
                                    stroke="#888888" 
                                    fontSize={12} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: any) => [formatCurrency(value as number), "Ventas"]}
                                    labelStyle={{ fontWeight: 'bold', color: '#111' }}
                                />
                                <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm relative">
                    <h3 className="font-bold text-lg mb-6 tracking-tight">Ventas por Categoría</h3>
                    <div className="w-full relative min-h-[300px]" style={{ height: "300px" }}>
                        {data.charts.categorySales.length > 0 ? (
                            <ResponsiveContainer width="99%" minWidth={1} minHeight={1}>
                                <PieChart>
                                    <Pie
                                        data={data.charts.categorySales}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {data.charts.categorySales.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        formatter={(value: any) => formatCurrency(value as number)}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-muted-foreground font-semibold">No hay suficientes datos</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
