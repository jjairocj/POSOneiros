"use client";
import React from "react";
import { useBusinessInfo } from "@/app/components/BusinessInfoProvider";
import { moneyInWords } from "@/app/lib/numberToWords";

/** Used as the customer's document number when a sale has none on file —
 * the standard placeholder Colombian accounting practice uses for a final
 * consumer who didn't provide identification. */
const GENERIC_CONSUMER_ID = "222222222";

interface ReceiptDetail {
    productName?: string;
    product?: { name: string };
    quantity: number;
    unitPrice: number;
    discount?: number;
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
    discount?: number;
    promotionName?: string | null;
    status?: string;
    shiftId: string;
    shift?: { register?: { name: string; prefix?: string | null } | null; user?: { name: string } | null } | null;
    customer?: { fullName: string; documentId?: string | null; phone?: string | null; email?: string | null } | null;
    details: ReceiptDetail[];
    payments: { method: string; amount: number; subAccountLabel?: string | null }[];
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
    const widthMm = Number(business?.receiptWidthMm) || 48;

    // Split-bill sales carry a subAccountLabel per payment — group them so the
    // ticket shows who paid what instead of a flat, unlabeled list of amounts.
    const hasSubAccountPayments = sale.payments.some((p) => p.subAccountLabel);
    const paymentsByPerson: { label: string; payments: typeof sale.payments }[] = [];
    if (hasSubAccountPayments) {
        for (const p of sale.payments) {
            const label = p.subAccountLabel || "Sin asignar";
            let group = paymentsByPerson.find((g) => g.label === label);
            if (!group) { group = { label, payments: [] }; paymentsByPerson.push(group); }
            group.payments.push(p);
        }
    }

    return (
        // 58mm thermal paper (Xprinter and similar): the printable area is
        // narrower than the nominal roll width once the printer's own
        // hardware margins are subtracted, so the receipt targets a
        // configurable width (Ajustes → Recibo/Ticket), 48mm by default, not
        // the full 58mm. Two columns (item — total) instead of three: a
        // third "unit price" column doesn't fit legibly at this width, and
        // the unit price alone isn't worth losing legibility on the total,
        // which is what matters most.
        <div id="print-receipt" style={{ width: `${widthMm}mm` }} className="text-black bg-white p-1 text-[10px] leading-tight font-mono mx-auto">
            <div className="text-center mb-2">
                {business?.showLogoOnReceipt !== "false" && business?.businessLogoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- printed receipt markup, not a Next page image
                    <img
                        src={business.businessLogoUrl}
                        alt=""
                        className="max-h-10 mx-auto mb-1 object-contain"
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                )}
                <h1 className="text-xs font-bold uppercase mb-0.5 leading-tight">{business?.businessName || "Oneiros POS"}</h1>
                {business?.businessNit && <p>NIT: {business.businessNit}</p>}
                {business?.businessAddress && <p>{business.businessAddress}</p>}
                {business?.cityCountry && <p>{business.cityCountry}</p>}
                {business?.businessPhone && <p>Tel: {business.businessPhone}</p>}
            </div>

            <div className="border-t border-b border-black border-dashed py-1 mb-2">
                <p>Consec. #{receiptNumber(sale)}</p>
                {sale.status === "CANCELLED" && <p className="font-bold">*** ANULADO ***</p>}
                {subAccountLabel && <p>Cuenta: {subAccountLabel}</p>}
                <p>Fecha de pago: {new Date(sale.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })}</p>
                <p>Caja: {sale.shift?.register?.name ?? sale.shiftId.slice(0, 8)}</p>
                {sale.shift?.user?.name && <p>Atendió: {sale.shift.user.name}</p>}
            </div>

            {/* Recibí de — identificación de quien entrega el dinero (recibo de
                caja, no factura). Sin cliente asociado se usa el documento
                genérico de consumidor final, no se deja en blanco. */}
            <div className="border-b border-black border-dashed pb-1 mb-2">
                <p className="font-bold">Recibí de:</p>
                <p>{sale.customer?.fullName || "Consumidor final"}</p>
                <p>C.C./NIT: {sale.customer?.documentId || GENERIC_CONSUMER_ID}</p>
                {(sale.customer?.phone || sale.customer?.email) && (
                    <p>Contacto: {[sale.customer?.phone, sale.customer?.email].filter(Boolean).join(" · ")}</p>
                )}
            </div>

            <div className="mb-2">
                {sale.details.map((detail, idx) => (
                    <div key={idx} className="mb-1">
                        <div>{detail.quantity}x {detail.productName || detail.product?.name}</div>
                        <div className="flex justify-between">
                            <span>{money(detail.unitPrice)} c/u</span>
                            <span className="font-bold">{money(detail.subtotal)}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-black pt-1 mb-2 flex flex-col items-stretch">
                {sale.promotionName && (
                    <p className="mb-1 font-bold">★ Promo aplicada: {sale.promotionName}</p>
                )}
                {(sale.discount ?? 0) > 0 && (
                    <div className="flex justify-between mb-1">
                        <span>Descuento:</span><span>-{money(sale.discount ?? 0)}</span>
                    </div>
                )}
                <p className="font-bold text-xs border-b border-black border-dashed mb-1 pb-1 text-right">
                    TOTAL: {money(sale.total)}
                </p>
                <div className="space-y-0.5 mb-1">
                    {hasSubAccountPayments ? (
                        paymentsByPerson.map((group, gi) => {
                            const groupTotal = group.payments.reduce((acc, p) => acc + p.amount, 0);
                            return (
                                <div key={gi} className="border-t border-black border-dotted pt-0.5 mt-0.5 first:border-t-0 first:pt-0 first:mt-0">
                                    <p className="font-bold">{group.label}</p>
                                    {group.payments.map((p, pi) => (
                                        <div key={pi} className="flex justify-between pl-1">
                                            <span>{METHOD_LABEL[p.method] ?? p.method}:</span>
                                            <span>{money(p.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pl-1 font-bold">
                                        <span>Subtotal:</span><span>{money(groupTotal)}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        sale.payments.map((p, idx) => (
                            <div key={idx} className="flex justify-between">
                                <span>{METHOD_LABEL[p.method] ?? p.method}:</span>
                                <span>{money(p.amount)}</span>
                            </div>
                        ))
                    )}
                    {paid > sale.total + 0.5 && (
                        <div className="flex justify-between"><span>Cambio:</span><span>{money(paid - sale.total)}</span></div>
                    )}
                </div>
                <p className="mt-1">Concepto: Pago de la Venta No. {receiptNumber(sale)}</p>
                <p className="italic">Son: {moneyInWords(sale.total)}</p>
            </div>

            {showTaxes && (
                <div className="border-t border-black pt-1 mb-2">
                    <p className="font-bold mb-0.5">Impuestos</p>
                    <div className="flex justify-between"><span>Base:</span><span>{money(base - sale.details.reduce((acc, d) => acc + (d.discount ?? 0), 0))}</span></div>
                    {iva > 0 && <div className="flex justify-between"><span>IVA:</span><span>{money(iva)}</span></div>}
                    {ica > 0 && <div className="flex justify-between"><span>ICA:</span><span>{money(ica)}</span></div>}
                    {impo > 0 && <div className="flex justify-between"><span>Impoconsumo:</span><span>{money(impo)}</span></div>}
                </div>
            )}

            <div className="text-center mt-2">
                <p>{business?.receiptFooter || "¡Gracias por su compra!"}</p>
            </div>

            {/* Required disclaimer: this is a recibo de caja (cash receipt), not a
                DIAN sales invoice or documento equivalente — see docs/16. */}
            <p className="text-center font-bold mt-2 pt-1 border-t border-black">
                Este documento no es una factura de venta ni documento equivalente.
            </p>
        </div>
    );
}
