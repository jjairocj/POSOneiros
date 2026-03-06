"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from "./product-form";

export type ProductColumn = {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category?: { name: string } | null;
  taxIva?: number | null;
  taxIca?: number | null;
  taxImpoConsumo?: number | null;
};

export const columns: ColumnDef<ProductColumn>[] = [
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
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
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
  {
    id: "actions",
    cell: ({ row }) => {
      const product = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(product.id)}
            >
              Copiar ID del producto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            
            <ProductForm 
                product={product} 
                trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Editar precio y stock
                    </DropdownMenuItem>
                }
            />

            <DropdownMenuItem className="text-destructive">Eliminar producto</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
