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
import { CategoryForm } from "./category-form";

export type CategoryColumn = {
  id: string;
  name: string;
  sortOrder: number;
  _count?: { products: number };
};

export const categoryColumns: ColumnDef<CategoryColumn>[] = [
  {
    accessorKey: "sortOrder",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 hover:bg-transparent"
        >
          Orden (POS)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => <div className="font-mono text-center w-12 bg-muted/50 rounded-lg p-1">{row.getValue("sortOrder")}</div>,
  },
  {
    accessorKey: "name",
    header: "Nombre de la Categoría",
    cell: ({ row }) => <div className="font-bold text-lg">{row.getValue("name")}</div>,
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const category = row.original;
 
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
            <DropdownMenuSeparator />
            <CategoryForm 
                category={category} 
                trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        Editar categoría
                    </DropdownMenuItem>
                }
            />
            {/* Delete functionality to be wired up or handled in a separate form if needed */}
            <DropdownMenuItem className="text-destructive">Eliminar categoría</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];
