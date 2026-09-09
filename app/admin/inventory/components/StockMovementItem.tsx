"use client";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { StockMovementModal } from "./StockMovementModal";

export function StockMovementItem({ product }: { product: { id: string; name: string; stock: number; cost: number } }) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setOpen(true); }}>Entrada / merma / ajuste</DropdownMenuItem>
            {open && <StockMovementModal product={product} onClose={() => setOpen(false)} />}
        </>
    );
}
