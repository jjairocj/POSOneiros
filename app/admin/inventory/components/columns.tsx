"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RowActions } from "./RowActions";

export type ProductColumn = {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category?: { name: string } | null;
  categoryId?: string | null;
  family?: { name: string } | null;
  isActive?: boolean;
  taxIva?: number | null;
  taxIca?: number | null;
  taxImpoConsumo?: number | null;
  imageUrl?: string | null;
  isFavorite?: boolean;
  trackingMode?: string;
};

/** `columns` is the ADMIN/SUPERVISOR shape (both always have full catalog
 * access). Pages that can be reached by a permission-limited CASHIER build
 * their own with `buildColumns(perms)` instead — see admin/inventory/page.tsx. */
export function buildColumns(perms: { canManageCatalog: boolean; canReceiveInventory: boolean }): ColumnDef<ProductColumn>[] {
  return [...BASE_COLUMNS, {
    id: "actions",
    cell: ({ row }) => <RowActions product={row.original} {...perms} />,
  }];
}

const BASE_COLUMNS: ColumnDef<ProductColumn>[] = [
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("code")}</div>,
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent"
        >
          Nombre del Producto
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
      <div className="font-medium flex items-center gap-2">
        {row.getValue("name")}
        {row.original.isActive === false && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-md uppercase bg-muted text-muted-foreground">Inactivo</span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "category.name",
    id: "category",
    header: "Categoría",
    cell: ({ row }) => {
        const cat = row.original.category?.name || "Sin Categoría";
        return <div className="text-muted-foreground">{cat}</div>;
    },
  },
  {
    accessorKey: "stock",
    header: () => <div className="text-right">Stock</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("stock"))
      const isLow = amount <= 5;
      
      return (
        <div className={`text-right font-bold ${isLow ? 'text-destructive' : 'text-foreground'}`}>
          {amount}
        </div>
      )
    },
  },
  {
    accessorKey: "cost",
    header: () => <div className="text-right">Costo unitario</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("cost"))
      const formatted = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
      }).format(amount)
 
      return <div className="text-right text-muted-foreground">{formatted}</div>
    },
  },
  {
    accessorKey: "price",
    header: () => <div className="text-right">Precio Venta (Base)</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("price"))
      const formatted = new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
      }).format(amount)
 
      return <div className="text-right font-bold">{formatted}</div>
    },
  },
  {
    accessorKey: "taxIva",
    header: () => <div className="text-right">IVA %</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("taxIva") || "0")
      return <div className="text-right text-muted-foreground">{isNaN(amount) ? 0 : amount}%</div>
    },
  },
];

/** Static export for ADMIN/SUPERVISOR pages (always full access). */
export const columns: ColumnDef<ProductColumn>[] = buildColumns({ canManageCatalog: true, canReceiveInventory: true });
