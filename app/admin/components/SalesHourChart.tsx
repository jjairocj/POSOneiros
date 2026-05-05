"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { formatMoney } from "@/app/lib/money";
import type { HourlySale } from "@/app/actions/dashboard";

interface Props {
    data: HourlySale[];
}

export function SalesHourChart({ data }: Props) {
    // Only show hours with activity + a few around them for context, or full 24h if sparse
    return (
        <ResponsiveContainer width="99%" height={280} minWidth={1}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#10B981" stopOpacity={0.3} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                <XAxis
                    dataKey="label"
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                />
                <YAxis
                    stroke="#888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) =>
                        v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}k`
                    }
                    width={48}
                />
                <Tooltip
                    contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                        fontSize: "13px",
                    }}
                    formatter={(value: number | undefined) => [formatMoney(value ?? 0), "Ventas"]}
                    labelFormatter={(label) => `Hora: ${label}`}
                />
                <Bar
                    dataKey="total"
                    fill="url(#barGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
