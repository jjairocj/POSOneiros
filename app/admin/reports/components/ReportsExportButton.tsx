"use client";

import { Download, TrendingUp, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
    /** YYYY-MM-DD range applied to the exports. */
    from: string;
    to: string;
}

/** Server-generated .xlsx downloads (real formatting — see app/lib/xlsx.ts). */
export function ReportsExportButton({ from, to }: Props) {
    const range = `?from=${from}&to=${to}`;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2 font-semibold">
                    <Download className="w-4 h-4" /> Exportar <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Del {from} al {to}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <a href={`/api/export/product-ranking${range}`} className="flex items-center gap-2 cursor-pointer"><TrendingUp className="w-4 h-4" /> Rentabilidad de productos (.xlsx)</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <a href={`/api/export/promotion-usage${range}`} className="flex items-center gap-2 cursor-pointer"><Sparkles className="w-4 h-4" /> Uso de promociones (.xlsx)</a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
