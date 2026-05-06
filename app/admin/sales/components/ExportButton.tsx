"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface HistoryRow {
    id: string;
    shortId: string;
    createdAt: string;
    total: number;
    status: string;
    sellerName: string;
    shiftId: string;
    payments: string;
}

interface Props {
    data: HistoryRow[];
    period?: string;
}

export function ExportButton({ data, period }: Props) {
    const [loading, setLoading] = useState(false);

    const handleExport = () => {
        setLoading(true);
        try {
            const rows = data.map((s) => ({
                "Ticket #": s.shortId,
                "Fecha": s.createdAt,
                "Cajero": s.sellerName,
                "Método de pago": s.payments,
                "Total (COP)": s.total,
                "Estado": s.status,
            }));

            const ws = XLSX.utils.json_to_sheet(rows);

            // Column widths
            ws["!cols"] = [
                { wch: 12 }, { wch: 20 }, { wch: 22 },
                { wch: 22 }, { wch: 14 }, { wch: 12 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Ventas");

            const fileName = `ventas_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
            XLSX.writeFile(wb, fileName);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading || data.length === 0}
            className="rounded-xl gap-2 font-semibold"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Exportar Excel
        </Button>
    );
}
