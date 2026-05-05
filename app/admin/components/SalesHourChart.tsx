"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTheme } from "next-themes";
import { formatMoney } from "@/app/lib/money";
import type { HourlySale } from "@/app/actions/dashboard";

interface Props {
    data: HourlySale[];
}

export function SalesHourChart({ data }: Props) {
    const { theme } = useTheme();
    const dark = theme === "dark";

    const tooltipStyle = {
        borderRadius: "12px",
        border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
        backgroundColor: dark ? "#1c1c1e" : "#ffffff",
        boxShadow: dark
            ? "0 4px 24px rgba(0,0,0,0.5)"
            : "0 4px 16px rgba(0,0,0,0.10)",
        fontSize: "13px",
        color: dark ? "#f5f5f5" : "#111",
    };

    const axisColor = dark ? "#666" : "#999";

    return (
        <ResponsiveContainer width="99%" height={280} minWidth={1}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.3} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}
                    vertical={false}
                />
                <XAxis
                    dataKey="label"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                />
                <YAxis
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}k`}
                    width={48}
                />
                <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }}
                    formatter={(value: number | undefined) => [formatMoney(value ?? 0), "Ventas"]}
                    labelFormatter={(label) => `Hora: ${label}`}
                />
                <Bar dataKey="total" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
        </ResponsiveContainer>
    );
}
