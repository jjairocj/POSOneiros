"use client";

import { Download, FileText, Package, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
    /** YYYY-MM-DD range applied to the sales exports. */
    from: string;
    to: string;
}

/** Server-generated CSV downloads (open directly in Excel). */
export function ExportButton({ from, to }: Props) {
    const range = `?from=${from}&to=${to}`;
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2 font-semibold">
                    <Download className="w-4 h-4" /> Exportar <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl min-w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Del {from} al {to}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                    <a href={`/api/export/sales${range}`} className="flex items-center gap-2 cursor-pointer"><FileText className="w-4 h-4" /> Ventas (una fila por venta)</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a href={`/api/export/sales-detail${range}`} className="flex items-center gap-2 cursor-pointer"><FileText className="w-4 h-4" /> Ventas por producto</a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
                    <a href="/api/export/inventory" className="flex items-center gap-2 cursor-pointer"><Package className="w-4 h-4" /> Inventario completo</a>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
