import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockShiftFindUnique = vi.fn();
const mockRequireSession = vi.fn();
const mockRequireAdmin = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: { shift: { findUnique: (...a: any[]) => mockShiftFindUnique(...a) } },
}));
vi.mock('../../lib/auth', () => ({
    requireSession: (...a: any[]) => mockRequireSession(...a),
    requireAdmin: (...a: any[]) => mockRequireAdmin(...a),
}));

import { GET } from '../../app/api/export/[kind]/route';

function makeShift(overrides: Partial<Record<string, any>> = {}) {
    return {
        id: 'shift1',
        register: { name: 'Caja Principal', prefix: 'POS' },
        user: { name: 'Jhon' },
        userId: 'u1',
        startTime: new Date('2026-09-11T10:00:00-05:00'),
        endTime: new Date('2026-09-11T18:00:00-05:00'),
        baseAmount: 50000,
        closeAmount: 120000,
        sales: [],
        ...overrides,
    };
}

async function callShiftExport(id = 'shift1') {
    const req = new NextRequest(`http://localhost/api/export/shift?id=${id}`);
    return GET(req, { params: Promise.resolve({ kind: 'shift' }) });
}

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ id: 'u1', role: 'CASHIER' });
});

describe('GET /api/export/shift', () => {
    it('requires the id query param', async () => {
        const req = new NextRequest('http://localhost/api/export/shift');
        const res = await GET(req, { params: Promise.resolve({ kind: 'shift' }) });
        expect(res.status).toBe(400);
    });

    it('404s when the shift does not exist', async () => {
        mockShiftFindUnique.mockResolvedValue(null);
        const res = await callShiftExport();
        expect(res.status).toBe(404);
    });

    it('403s when the shift belongs to someone else and the caller is not ADMIN', async () => {
        mockShiftFindUnique.mockResolvedValue(makeShift({ userId: 'someone-else' }));
        const res = await callShiftExport();
        expect(res.status).toBe(403);
    });

    it('sums payments by method into separate columns instead of one crammed cell, and flags split sales', async () => {
        // The bug: an 8-person split bill sale used to cram all 13 payments
        // into a single "Pagos" text cell, repeated per product line. Now
        // each method gets its own numeric column, summed per sale.
        const splitSale = {
            id: 'sale1', number: 10, createdAt: new Date('2026-09-11T12:00:00-05:00'), status: 'COMPLETED',
            details: [{ productCode: 'C1', productName: 'Buldak Ramen', quantity: 3, unitPrice: 20000, taxIvaAmount: 0, taxIcaAmount: 0, taxImpoConsumoAmount: 0, subtotal: 51000 }],
            payments: [
                { method: 'CASH', amount: 10000, subAccountLabel: 'Persona 1' },
                { method: 'CARD', amount: 15000, subAccountLabel: 'Persona 2' },
                { method: 'TRANSFER', amount: 26000, subAccountLabel: 'Persona 3' },
            ],
        };
        mockShiftFindUnique.mockResolvedValue(makeShift({ sales: [splitSale] }));

        const res = await callShiftExport();
        expect(res.status).toBe(200);
        const csv = await res.text();
        const lines = csv.replace(/^﻿/, '').split('\r\n');
        expect(lines[0]).toBe('Fecha;Comprobante;Estado;Código;Producto;Cantidad;Precio unit.;Base;IVA;ICA;Impoconsumo;Total línea;Efectivo;Tarjeta;Transferencia;Cuenta dividida');

        const dataLine = lines[1].split(';');
        // No crammed "Efectivo 10000 | Tarjeta 15000 | ..." blob anywhere.
        expect(csv).not.toMatch(/\|/);
        expect(dataLine).toEqual(expect.arrayContaining(['10000', '15000', '26000', 'Sí']));
    });

    it('marks a normal (non-split) sale as not split, with zero in unused method columns', async () => {
        const normalSale = {
            id: 'sale2', number: 11, createdAt: new Date('2026-09-11T13:00:00-05:00'), status: 'COMPLETED',
            details: [{ productCode: 'C2', productName: 'Agua', quantity: 1, unitPrice: 2000, taxIvaAmount: 0, taxIcaAmount: 0, taxImpoConsumoAmount: 0, subtotal: 2000 }],
            payments: [{ method: 'CASH', amount: 2000 }],
        };
        mockShiftFindUnique.mockResolvedValue(makeShift({ sales: [normalSale] }));

        const res = await callShiftExport();
        const csv = await res.text();
        const dataLine = csv.replace(/^﻿/, '').split('\r\n')[1].split(';');
        expect(dataLine).toEqual(expect.arrayContaining(['2000', '0', '0', 'No']));
    });
});
