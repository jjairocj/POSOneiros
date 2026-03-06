"use client";
import React from "react";

export default function Receipt({ sale }: { sale: any }) {
    if (!sale) return null;

    return (
        <div id="print-receipt" className="hidden text-black bg-white w-[80mm] p-4 text-sm font-mono mx-auto">
            {/* Header */}
            <div className="text-center mb-4">
                <h1 className="text-xl font-bold uppercase mb-1">Oneiros POS</h1>
                <p className="text-xs">NIT: 123.456.789-0</p>
                <p className="text-xs">Calle Falsa 123, Ciudad</p>
                <p className="text-xs">Tel: +57 300 123 4567</p>
            </div>

            <div className="border-t border-b border-black py-2 mb-4 text-xs">
                <p><strong>Factura:</strong> #{sale.id.slice(0, 8).toUpperCase()}</p>
                <p><strong>Fecha:</strong> {new Date(sale.createdAt).toLocaleString()}</p>
                <p><strong>Caja:</strong> {sale.shiftId.slice(0, 8)}</p>
            </div>

            {/* Items */}
            <table className="w-full text-xs text-left mb-4">
                <thead>
                    <tr className="border-b border-black/50">
                        <th className="font-bold pb-1 w-1/2">Cant x Artículo</th>
                        <th className="font-bold pb-1 w-1/4 text-right">Vr. Unit</th>
                        <th className="font-bold pb-1 w-1/4 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.details.map((detail: any, idx: number) => (
                        <tr key={idx} className="align-top">
                            <td className="py-1 pr-1">
                                {detail.quantity}x {detail.product.name}
                            </td>
                            <td className="py-1 text-right">${detail.unitPrice.toLocaleString()}</td>
                            <td className="py-1 text-right">${detail.subtotal.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div className="border-t border-black pt-2 mb-4 text-sm flex flex-col items-end">
                <p className="font-bold text-lg border-b border-black border-dashed mb-2 pb-1 w-full text-right">
                    TOTAL: ${sale.total.toLocaleString()}
                </p>
                
                {/* Payments */}
                <div className="w-full text-xs space-y-1 mb-2">
                    {sale.payments.map((p: any, idx: number) => (
                        <div key={idx} className="flex justify-between">
                            <span>Pago {p.method}:</span>
                            <span>${p.amount.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Taxes Breakdown */}
            <div className="border-t border-black pt-2 mb-4 text-xs">
                <p className="font-bold mb-1">=== Discriminación de Impuestos ===</p>
                {/* Normally we'd aggregate taxes by rate, but for simplicity here's total taxes. */}
                <div className="flex justify-between">
                    <span>Subtotal Base:</span>
                    <span>${sale.details.reduce((acc: number, d: any) => acc + (d.unitPrice * d.quantity), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total IVA:</span>
                    <span>${sale.details.reduce((acc: number, d: any) => acc + d.taxIvaAmount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total ICA:</span>
                    <span>${sale.details.reduce((acc: number, d: any) => acc + d.taxIcaAmount, 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total Impoconsumo:</span>
                    <span>${sale.details.reduce((acc: number, d: any) => acc + d.taxImpoConsumoAmount, 0).toLocaleString()}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-6">
                <p className="mb-1">¡Gracias por su compra!</p>
                <p className="font-bold">Software POS por Oneiros</p>
                <p className="mt-4 break-words text-[10px] text-gray-500">CUFE: {sale.id}</p>
            </div>
        </div>
    );
}
