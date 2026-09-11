"use client";
import { CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import Receipt, { type ReceiptSale } from "./Receipt";
import { formatMoney } from "@/app/lib/money";

/** Opens the hidden #print-receipt node in an iframe and prints it. */
export function printReceipt() {
    const receiptNode = document.getElementById("print-receipt");
    if (!receiptNode) return;
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map((node) => node.outerHTML).join("");
    const content = receiptNode.cloneNode(true) as HTMLElement;
    content.classList.remove("hidden");
    content.classList.add("block");
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    // @page size in mm, matching the 58mm thermal roll (Receipt.tsx targets
    // a 48mm printable area within it) — without this Chrome defaults to
    // Letter/A4 and either scales the ticket down or splits it across pages.
    doc.write(`<html><head>${styles}<style>@page{size:58mm auto;margin:0}body{margin:0;padding:0;background:white}</style></head><body>${content.outerHTML}</body></html>`);
    doc.close();
    iframe.contentWindow?.focus();
    setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
}

export default function SaleSuccess({
    sale,
    change,
    title = "¡Venta registrada!",
    subtitle,
    subAccountLabel,
    onClose,
}: {
    sale: ReceiptSale | null;
    change: number;
    title?: string;
    subtitle?: string;
    subAccountLabel?: string;
    onClose: () => void;
}) {
    return (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex items-center justify-center">
                <span className="absolute w-28 h-28 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: "1s", animationIterationCount: 2 }} />
                <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-in zoom-in duration-300">
                    <CheckCircle2 className="w-14 h-14 text-white" />
                </div>
            </div>
            <div>
                <h2 className="text-3xl font-black text-foreground mb-2">{title}</h2>
                {sale?.number != null && (
                    <p className="text-xs font-mono text-muted-foreground mb-2">
                        Comprobante #{sale.shift?.register?.prefix ? `${sale.shift.register.prefix}-` : ""}{sale.number}
                    </p>
                )}
                {change > 0 ? (
                    <p className="text-muted-foreground">
                        Cambio a entregar:{" "}
                        <strong className="text-2xl text-emerald-500 block mt-1">{formatMoney(change)}</strong>
                    </p>
                ) : (
                    <p className="text-muted-foreground">{subtitle ?? "Pago exacto recibido."}</p>
                )}
            </div>
            <div className="flex w-full gap-4 mt-8 pt-6 border-t border-border">
                <Button variant="outline" className="flex-1 h-14 rounded-2xl text-base font-bold" onClick={onClose}>
                    Cerrar
                </Button>
                {sale && (
                    <Button className="flex-1 h-14 rounded-2xl text-base font-bold shadow-lg" onClick={printReceipt}>
                        <Printer className="w-5 h-5 mr-2" /> Imprimir Ticket
                    </Button>
                )}
            </div>
            {sale && (
                <div className="hidden" id="print-receipt">
                    <Receipt sale={sale} subAccountLabel={subAccountLabel} />
                </div>
            )}
        </div>
    );
}
