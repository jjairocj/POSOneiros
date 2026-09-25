"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, Ban } from "lucide-react";
import { toast } from "sonner";
import Receipt, { type ReceiptSale } from "@/app/pos/components/Checkout/Receipt";
import { printReceipt } from "@/app/pos/components/Checkout/SaleSuccess";
import { getSaleForPrint } from "@/app/actions/report";

/**
 * Ver/Imprimir/Anular in one place: the receipt renders full-size on screen
 * (not hidden-then-printed like the old reprint flow), so an admin can
 * actually check a ticket's contents without sending anything to a printer.
 */
export function ViewReceiptModal({
    saleId,
    shortId,
    canCancel,
    onClose,
    onRequestCancel,
}: {
    saleId: string;
    shortId: string;
    canCancel: boolean;
    onClose: () => void;
    onRequestCancel: () => void;
}) {
    const [loading, setLoading] = useState(true);
    const [sale, setSale] = useState<ReceiptSale | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getSaleForPrint(saleId).then((res) => {
            if (cancelled) return;
            if (!res.success || !res.sale) { setError(res.error || "No se pudo cargar el comprobante."); return; }
            setSale(res.sale as unknown as ReceiptSale);
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [saleId]);

    const handlePrint = () => {
        const ok = document.getElementById("print-receipt");
        if (!ok) { toast.error("El comprobante todavía no está listo."); return; }
        printReceipt();
    };

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl">
                <DialogHeader>
                    <DialogTitle>Comprobante {shortId}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando...
                    </div>
                ) : error ? (
                    <p className="text-destructive text-sm py-6 text-center">{error}</p>
                ) : (
                    <>
                        {/* Scaled up from the printer's actual (~48mm) width — legible on
                            screen while the underlying markup, and printReceipt()'s
                            @page sizing, stay tied to the real ticket width. `zoom`
                            (not `transform: scale`) so the white card actually grows
                            with the content instead of clipping it. */}
                        <div className="bg-white rounded-2xl p-4 flex justify-center" style={{ zoom: 1.6 } as React.CSSProperties}>
                            <Receipt sale={sale} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={handlePrint} className="flex-1 rounded-xl gap-2">
                                <Printer className="w-4 h-4" /> Imprimir
                            </Button>
                            {canCancel && sale?.status !== "CANCELLED" && (
                                <Button type="button" variant="outline" onClick={onRequestCancel} className="flex-1 rounded-xl gap-2 text-destructive border-destructive/30 hover:bg-destructive/10">
                                    <Ban className="w-4 h-4" /> Anular venta
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
