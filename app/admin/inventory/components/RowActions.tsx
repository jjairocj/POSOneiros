"use client";
import { useState } from "react";
import { Pencil, PackagePlus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductForm } from "./product-form";
import { DeleteProductButton } from "./DeleteProductItem";
import { StockMovementModal } from "./StockMovementModal";
import { ReceiveLotModal } from "./ReceiveLotModal";
import type { ProductColumn } from "./columns";

/**
 * Row actions as inline icon buttons — one tap instead of opening a menu
 * first. Modals are rendered as siblings, not nested inside a trigger, so
 * they aren't torn down by anything else in the row unmounting.
 */
interface RowActionsProps {
  product: ProductColumn;
  /** Both default true: ADMIN/SUPERVISOR always have full access — see the
   * static `columns` export. A permission-limited CASHIER gets explicit
   * false via `buildColumns()`. */
  canManageCatalog?: boolean;
  canReceiveInventory?: boolean;
}

export function RowActions({ product, canManageCatalog = true, canReceiveInventory = true }: RowActionsProps) {
  const [movementOpen, setMovementOpen] = useState(false);
  const [lotOpen, setLotOpen] = useState(false);
  const isLotTracked = product.trackingMode === "LOT";
  if (!canManageCatalog && !canReceiveInventory) return null;
  return (
    <>
      <div className="flex items-center justify-end gap-0.5">
        {canManageCatalog && (
          <ProductForm
            product={product}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Editar producto">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar producto</span>
              </Button>
            }
          />
        )}
        {canReceiveInventory && isLotTracked && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            title="Recibir lote"
            onClick={() => setLotOpen(true)}
          >
            <PackagePlus className="h-4 w-4" />
            <span className="sr-only">Recibir lote</span>
          </Button>
        )}
        {canReceiveInventory && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            title={isLotTracked ? "Merma / ajuste (sin lote)" : "Entrada / merma / ajuste"}
            onClick={() => setMovementOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="sr-only">{isLotTracked ? "Merma / ajuste (sin lote)" : "Entrada / merma / ajuste"}</span>
          </Button>
        )}
        {canManageCatalog && (
          <DeleteProductButton productId={product.id} productName={product.name} />
        )}
      </div>
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
