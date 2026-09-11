"use client";
import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProductForm } from "./product-form";
import { DeleteProductItem } from "./DeleteProductItem";
import { StockMovementModal } from "./StockMovementModal";
import { ReceiveLotModal } from "./ReceiveLotModal";
import type { ProductColumn } from "./columns";

/**
 * Row menu. Modals are rendered as siblings of the DropdownMenu, not inside it:
 * Radix unmounts the menu content on outside clicks, which would tear down a
 * modal that lived inside the menu before the user could submit it.
 */
export function RowActions({ product }: { product: ProductColumn }) {
  const [movementOpen, setMovementOpen] = useState(false);
  const [lotOpen, setLotOpen] = useState(false);
  const isLotTracked = product.trackingMode === "LOT";
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menú</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <ProductForm
            product={product}
            trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}>Editar producto</DropdownMenuItem>}
          />
          {isLotTracked && (
            <DropdownMenuItem onSelect={() => setLotOpen(true)}>Recibir lote</DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setMovementOpen(true)}>
            {isLotTracked ? "Merma / ajuste (sin lote)" : "Entrada / merma / ajuste"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DeleteProductItem productId={product.id} productName={product.name} />
        </DropdownMenuContent>
      </DropdownMenu>
      {movementOpen && (
        <StockMovementModal
          product={{ id: product.id, name: product.name, stock: product.stock, cost: product.cost }}
          onClose={() => setMovementOpen(false)}
        />
      )}
      {lotOpen && (
        <ReceiveLotModal
          product={{ id: product.id, name: product.name, stock: product.stock }}
          onClose={() => setLotOpen(false)}
        />
      )}
    </>
  );
}
