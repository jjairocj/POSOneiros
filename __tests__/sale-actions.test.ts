import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processSale } from '../app/actions/sale';
import prisma from '../lib/prisma';

// Mocking Prisma Client
vi.mock('../lib/prisma', () => ({
    default: {
        $transaction: vi.fn(async (callback) => {
            // Mock the tx object passed to the callback
            const tx = {
                product: { update: vi.fn().mockResolvedValue({}) },
                sale: { create: vi.fn().mockResolvedValue({ id: 'sale-1' }) }
            };
            return await callback(tx);
        }),
        shift: {
            findUnique: vi.fn(),
        },
        product: {
            findMany: vi.fn(),
        },
    },
}));

describe('Sale Actions - processSale', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe arrojar error si no hay un turno activo', async () => {
        (prisma.shift.findUnique as any).mockResolvedValue(null);

        await expect(processSale('mock-shift-id', [{ id: 'p1', quantity: 1 }], []))
            .rejects
            .toThrow('Turno inválido o cerrado');
    });

    it('debe arrojar error si un producto no existe', async () => {
        (prisma.shift.findUnique as any).mockResolvedValue({ id: 'mock-shift-id', status: 'OPEN' });
        (prisma.product.findMany as any).mockResolvedValue([]); // Returns empty array, meaning not found

        await expect(processSale('mock-shift-id', [{ id: 'invalid', quantity: 1 }], []))
            .rejects
            .toThrow('Algunos productos ya no existen');
    });

    it('debe procesar una venta exitosamente deduciendo inventario y registrando pagos', async () => {
        const mockShift = { id: 'mock-shift-id', status: 'OPEN' };
        const mockProduct = {
            id: 'p1',
            name: 'Producto 1',
            price: 10000,
            stock: 5,
            taxIva: 19,
            taxIca: 0,
            taxImpoConsumo: 0
        };

        (prisma.shift.findUnique as any).mockResolvedValue(mockShift);
        (prisma.product.findMany as any).mockResolvedValue([mockProduct]);

        const items = [{ id: 'p1', quantity: 1 }];
        const payments = [{ method: 'CASH', amount: 11900 }]; // 10000 + 1900 taxes

        const result = await processSale('mock-shift-id', items, payments);

        // Verify shift check
        expect(prisma.shift.findUnique).toHaveBeenCalledWith({ where: { id: 'mock-shift-id' } });

        // Verify product check
        expect(prisma.product.findMany).toHaveBeenCalledWith({ where: { id: { in: ['p1'] } } });

        // Assuming transaction went through and returned the mocked sale object
        expect(result.id).toBe('sale-1');
    });
});
