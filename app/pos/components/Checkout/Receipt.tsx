"use client";
import React from "react";
import { useBusinessInfo } from "@/app/components/BusinessInfoProvider";

interface ReceiptDetail {
    productName?: string;
    product?: { name: string };
    quantity: number;
    unitPrice: number;
    subtotal: number;
    taxIvaAmount: number;
    taxIcaAmount: number;
    taxImpoConsumoAmount: number;
}

export interface ReceiptSale {
    id: string;
    number?: number | null;
    createdAt: string | Date;
    total: number;
    status?: string;
    shiftId: string;
    shift?: { register?: { name: string; prefix?: string | null } | null; user?: { name: string } | null } | null;
    details: ReceiptDetail[];
    payments: { method: string; amount: number }[];
}

const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const METHOD_LABEL: Record<string, string> = { CASH: "Efectivo", CARD: "Tarjeta", TRANSFER: "Transferencia" };

export function receiptNumber(sale: Pick<ReceiptSale, "id" | "number" | "shift">): string {
    if (sale.number == null) return sale.id.slice(0, 8).toUpperCase();
    const prefix = sale.shift?.register?.prefix;
    return prefix ? `${prefix}-${sale.number}` : String(sale.number);
}

export default function Receipt({ sale, subAccountLabel }: { sale: ReceiptSale | null; subAccountLabel?: string }) {
    const business = useBusinessInfo();
    if (!sale) return null;

    const showTaxes = business?.showTaxBreakdown !== "false";
    const base = sale.details.reduce((acc, d) => acc + d.unitPrice * d.quantity, 0);
    const iva = sale.details.reduce((acc, d) => acc + d.taxIvaAmount, 0);
    const ica = sale.details.reduce((acc, d) => acc + d.taxIcaAmount, 0);
    const impo = sale.details.reduce((acc, d) => acc + d.taxImpoConsumoAmount, 0);
    const paid = sale.payments.reduce((acc, p) => acc + p.amount, 0);

    return (
        <div id="print-receipt" className="text-black bg-white w-[80mm] p-4 text-sm font-mono mx-auto">
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase mb-1">{business?.businessName || "Oneiros POS"}</h1>
                {business?.businessNit && <p className="text-xs">NIT: {business.businessNit}</p>}
                {business?.businessAddress && <p className="text-xs">{business.businessAddress}</p>}
                {business?.cityCountry && <p className="text-xs">{business.cityCountry}</p>}
                {business?.businessPhone && <p className="text-xs">Tel: {business.businessPhone}</p>}
            </div>

            <div className="border-t border-b border-black py-2 mb-4 text-xs">
                <p><strong>Comprobante de venta:</strong> #{receiptNumber(sale)}</p>
                {sale.status === "CANCELLED" && <p className="font-bold">*** ANULADO ***</p>}
                {subAccountLabel && <p><strong>Cuenta:</strong> {subAccountLabel}</p>}
                <p><strong>Fecha:</strong> {new Date(sale.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>
                <p><strong>Caja:</strong> {sale.shift?.register?.name ?? sale.shiftId.slice(0, 8)}</p>
                {sale.shift?.user?.name && <p><strong>Atendió:</strong> {sale.shift.user.name}</p>}
            </div>

            <table className="w-full text-xs text-left mb-4">
                <thead>
                    <tr className="border-b border-black/50">
                        <th className="font-bold pb-1 w-1/2">Cant x Artículo</th>
                        <th className="font-bold pb-1 w-1/4 text-right">Vr. Unit</th>
                        <th className="font-bold pb-1 w-1/4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.details.map((detail, idx) => (
                        <tr key={idx} className="align-top">
                            <td className="py-1 pr-1">{detail.quantity}x {detail.productName || detail.product?.name}</td>
                            <td className="py-1 text-right">{money(detail.unitPrice)}</td>
                            <td className="py-1 text-right">{money(detail.subtotal)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t border-black pt-2 mb-4 text-sm flex flex-col items-end">
                <p className="font-bold text-lg border-b border-black border-dashed mb-2 pb-1 w-full text-right">
                    TOTAL: {money(sale.total)}
                </p>
                <div className="w-full text-xs space-y-1 mb-2">
                    {sale.payments.map((p, idx) => (
                        <div key={idx} className="flex justify-between">
                            <span>{METHOD_LABEL[p.method] ?? p.method}:</span>
                            <span>{money(p.amount)}</span>
                        </div>
                    ))}
                    {paid > sale.total + 0.5 && (
                        <div className="flex justify-between"><span>Cambio:</span><span>{money(paid - sale.total)}</span></div>
                    )}
                </div>
            </div>

            {showTaxes && (
                <div className="border-t border-black pt-2 mb-4 text-xs">
                    <p className="font-bold mb-1">Discriminación de impuestos</p>
                    <div className="flex justify-between"><span>Base:</span><span>{money(base)}</span></div>
                    {iva > 0 && <div className="flex justify-between"><span>IVA:</span><span>{money(iva)}</span></div>}
                    {ica > 0 && <div className="flex justify-between"><span>ICA:</span><span>{money(ica)}</span></div>}
                    {impo > 0 && <div className="flex justify-between"><span>Impoconsumo:</span><span>{money(impo)}</span></div>}
                </div>
            )}

            <div className="text-center text-xs mt-4">
                <p>{business?.receiptFooter || "¡Gracias por su compra!"}</p>
            </div>
        </div>
    );
}
