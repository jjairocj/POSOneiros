"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Printer, Maximize2, ReceiptText } from "lucide-react";
import Receipt from "@/app/pos/components/Checkout/Receipt";
import { getSaleForPrint } from "@/app/actions/report";

interface HistoryData {
    id: string;
    shortId: string;
    createdAt: string;
    total: number;
    status: string;
    sellerName: string;
    shiftId: string;
    payments: string;
}

export function HistoryTab({ data }: { data: HistoryData[] }) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [printingSale, setPrintingSale] = useState<any>(null);
    const [isPrinting, setIsPrinting] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    const handleReprint = async (saleId: string) => {
        if (isPrinting) return;
        setIsPrinting(true);
        try {
            const res = await getSaleForPrint(saleId);
            if (res.success && res.sale) {
                setPrintingSale(res.sale);
                // Wait for state update to render hidden receipt
                setTimeout(() => {
                    const receiptNode = document.getElementById("print-receipt");
                    if (!receiptNode) {
                        setIsPrinting(false);
                        return;
                    }
                    
                    const iframe = document.createElement("iframe");
                    iframe.style.display = "none";
                    document.body.appendChild(iframe);
                    
                    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
                        .map(node => node.outerHTML)
                        .join('');
                        
                    const doc = iframe.contentWindow?.document;
                    if (doc) {
                        doc.open();
                        doc.write(`
                            <html>
                                <head>${styles}</head>
                                <body style="margin:0;">${receiptNode.outerHTML}</body>
                            </html>
                        `);
                        doc.close();
                        
                        iframe.onload = () => {
                            iframe.contentWindow?.focus();
                            iframe.contentWindow?.print();
                            // Cleanup
                            setTimeout(() => {
                                document.body.removeChild(iframe);
                                setPrintingSale(null);
                                setIsPrinting(false);
                            }, 1000);
                        };
                    }
                }, 100);
            } else {
                alert("Error: " + res.error);
                setIsPrinting(false);
            }
        } catch (error) {
            console.error(error);
            setIsPrinting(false);
        }
    };

    const columns: ColumnDef<HistoryData>[] = [
        {
            accessorKey: "shortId",
            header: "Factura",
            cell: ({ row }) => <span className="font-mono font-bold">{row.getValue("shortId")}</span>,
        },
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                  <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="-ml-4 h-8 data-[state=open]:bg-accent">
                    <span>Fecha</span>
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                )
            },
            cell: ({ row }) => {
                const date = new Date(row.getValue("createdAt"));
                return (
                    <div className="flex flex-col">
                        <span className="font-medium whitespace-nowrap">{format(date, "d MMM, yyyy", { locale: es })}</span>
                        <span className="text-xs text-muted-foreground">{format(date, "h:mm a")}</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "sellerName",
            header: "Cajero / Usuario",
        },
        {
            accessorKey: "payments",
            header: "Método",
            cell: ({ row }) => {
                const methods = row.getValue("payments") as string;
                return (
                    <div className="flex flex-wrap gap-1">
                        {methods.split(', ').map((m, i) => (
                            <span key={i} className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-md uppercase">
                                {m}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            accessorKey: "total",
            header: () => <div className="text-right">Total</div>,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("total"));
                return <div className="text-right font-bold">{formatCurrency(amount)}</div>;
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const sale = row.original;
                return (
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleReprint(sale.id)}>
                            <Printer className="h-4 w-4" />
                        </Button>
                    </div>
                );
            },
        },
    ];

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
    });

    return (
        <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block rounded-3xl border border-border bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No hay transacciones registradas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Desktop */}
            <div className="hidden md:flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="rounded-xl"
                >
                    Anterior
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="rounded-xl"
                >
                    Siguiente
                </Button>
            </div>

            {/* Mobile Cards (Responsive) */}
            <div className="md:hidden space-y-4">
                {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                        const sale = row.original;
                        const date = new Date(sale.createdAt);
                        return (
                            <div key={sale.id} className="bg-card p-4 rounded-3xl border border-border shadow-sm flex flex-col gap-3 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/10 to-transparent pointer-events-none rounded-tr-3xl" />
                                
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <ReceiptText className="w-5 h-5 text-primary" />
                                            <span className="font-mono font-bold text-lg">{sale.shortId}</span>
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">
                                            {format(date, "d MMM, h:mm a", { locale: es })}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="font-black text-xl tracking-tight text-foreground">{formatCurrency(sale.total)}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 p-3 rounded-2xl">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Cajero</span>
                                        <span className="font-medium line-clamp-1">{sale.sellerName}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold mb-1">Método</span>
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {sale.payments.split(', ').map((m, i) => (
                                                <span key={i} className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-md uppercase">
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2 border-t mt-1 flex justify-end gap-2">
                                    <Button variant="secondary" className="w-full rounded-xl flex items-center gap-2" onClick={() => handleReprint(sale.id)}>
                                        <Printer className="w-4 h-4" /> Reimprimir
                                    </Button>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
                        No hay ventas registradas.
                    </div>
                )}

                {/* Mobile pagination */}
                <div className="flex items-center justify-between py-4">
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="rounded-xl flex-1 mr-2"
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground font-semibold">
                        Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="rounded-xl flex-1 ml-2"
                    >
                        Siguiente
                    </Button>
                </div>
            </div>
            
            {/* Hidden Receipt for Printing */}
            <div className="hidden">
                {printingSale && <Receipt sale={printingSale} />}
            </div>
        </div>
    );
}
