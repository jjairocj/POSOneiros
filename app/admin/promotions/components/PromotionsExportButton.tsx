"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Server-generated .xlsx of promotion usage for the given YYYY-MM-DD range. */
export function PromotionsExportButton({ from, to }: { from: string; to: string }) {
    return (
        <Button asChild variant="outline" className="rounded-xl gap-2 font-semibold">
            <a href={`/api/export/promotion-usage?from=${from}&to=${to}`}>
                <Download className="w-4 h-4" /> Exportar resultados (.xlsx)
            </a>
        </Button>
    );
}
