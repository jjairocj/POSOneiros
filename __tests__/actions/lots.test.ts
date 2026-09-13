import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransaction = vi.fn();
const mockProductLotFindMany = vi.fn();
const mockRawMaterialFindMany = vi.fn();
const mockRawMaterialCreate = vi.fn();
const mockRawMaterialLotUpdate = vi.fn();
const mockRawMaterialLotFindMany = vi.fn();
const mockProductFindMany = vi.fn();
const mockSaleDetailFindMany = vi.fn();
const mockRequirePermission = vi.fn();

const tx = {
    product: { findUnique: vi.fn(), update: vi.fn() },
    productLot: { create: vi.fn() },
    stockMovement: { create: vi.fn() },
    rawMaterialLot: { updateMany: vi.fn(), create: vi.fn() },
};

vi.mock('@/lib/prisma', () => ({
    default: {
        $transaction: (...a: any[]) => mockTransaction(...a),
        productLot: { findMany: (...a: any[]) => mockProductLotFindMany(...a) },
        rawMaterial: { findMany: (...a: any[]) => mockRawMaterialFindMany(...a), create: (...a: any[]) => mockRawMaterialCreate(...a) },
        rawMaterialLot: { update: (...a: any[]) => mockRawMaterialLotUpdate(...a), findMany: (...a: any[]) => mockRawMaterialLotFindMany(...a) },
        product: { findMany: (...a: any[]) => mockProductFindMany(...a) },
        saleDetail: { findMany: (...a: any[]) => mockSaleDetailFindMany(...a) },
    },
}));
vi.mock('@/lib/auth', () => ({ requirePermission: (...a: any[]) => mockRequirePermission(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { receiveProductLot, getProductLots, getRawMaterials, createRawMaterial, receiveRawMaterialLot, markRawMaterialLotDepleted, getExpiringItems, getRawMaterialConsumptionReport } from '../../app/actions/lots';
import prisma from '@/lib/prisma';

beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({ id: 'mgr1', role: 'ADMIN' });
    mockTransaction.mockImplementation(async (fn: any) => fn(tx));
});

describe('receiveProductLot', () => {
    it('requires RECEIVE_INVENTORY and rejects a non-positive quantity', async () => {
        const result = await receiveProductLot({ productId: 'p1', quantity: 0 });
        expect(result.ok).toBe(false);
        expect(mockRequirePermission).toHaveBeenCalledWith('RECEIVE_INVENTORY');
        expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('fails when the product does not exist', async () => {
        tx.product.findUnique.mockResolvedValue(null);
        const result: any = await receiveProductLot({ productId: 'missing', quantity: 5 });
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/no existe/i);
    });

    it('fails when the product is not LOT-tracked', async () => {
        tx.product.findUnique.mockResolvedValue({ id: 'p1', trackingMode: 'NONE' });
        const result: any = await receiveProductLot({ productId: 'p1', quantity: 5 });
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/seguimiento por lote/i);
    });

    it('creates the lot, increments stock, and logs a PURCHASE movement', async () => {
        tx.product.findUnique.mockResolvedValue({ id: 'p1', trackingMode: 'LOT' });
        tx.productLot.create.mockResolvedValue({ id: 'lot1', lotNumber: 'L100' });
        tx.product.update.mockResolvedValue({ stock: 30 });
        const result = await receiveProductLot({ productId: 'p1', quantity: 20, lotNumber: 'L100', supplierId: 'sup1' });
        expect(result.ok).toBe(true);
        expect(tx.productLot.create).toHaveBeenCalledWith({ data: expect.objectContaining({ productId: 'p1', quantityReceived: 20, quantityRemaining: 20, supplierId: 'sup1' }) });
        expect(tx.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { stock: { increment: 20 } } });
        expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'PURCHASE', quantity: 20, stockAfter: 30, lotId: 'lot1', reason: 'Lote L100' }) });
    });

    it('uses a generic reason when no lot number is given', async () => {
        tx.product.findUnique.mockResolvedValue({ id: 'p1', trackingMode: 'LOT' });
        tx.productLot.create.mockResolvedValue({ id: 'lot1', lotNumber: null });
        tx.product.update.mockResolvedValue({ stock: 10 });
        await receiveProductLot({ productId: 'p1', quantity: 10 });
        expect(tx.stockMovement.create).toHaveBeenCalledWith({ data: expect.objectContaining({ reason: 'Lote sin número' }) });
    });
});

describe('getProductLots', () => {
    it('requires RECEIVE_INVENTORY and serializes dates with supplier fallback', async () => {
        mockProductLotFindMany.mockResolvedValue([
            { id: 'l1', productId: 'p1', product: { name: 'Buldak' }, lotNumber: 'L1', expirationDate: new Date('2026-12-01'), receivedDate: new Date(), quantityReceived: 10, quantityRemaining: 5, supplier: { name: 'Distribuidora' } },
            { id: 'l2', productId: 'p1', product: { name: 'Buldak' }, lotNumber: null, expirationDate: null, receivedDate: new Date(), quantityReceived: 5, quantityRemaining: 5, supplier: null },
        ]);
        const result = await getProductLots('p1');
        expect(mockRequirePermission).toHaveBeenCalledWith('RECEIVE_INVENTORY');
        expect(result[0].supplierName).toBe('Distribuidora');
        expect(result[0].expirationDate).toBe(new Date('2026-12-01').toISOString());
        expect(result[1].supplierName).toBeNull();
        expect(result[1].expirationDate).toBeNull();
    });

    it('returns an empty array on error', async () => {
        mockProductLotFindMany.mockRejectedValue(new Error('db down'));
        expect(await getProductLots('p1')).toEqual([]);
    });
});

describe('getRawMaterials', () => {
    it('returns the active lot per material, or null when none is active', async () => {
        mockRawMaterialFindMany.mockResolvedValue([
            { id: 'rm1', name: 'Café en grano', lots: [{ id: 'l1', lotNumber: 'A1', expirationDate: null, receivedDate: new Date(), supplier: { name: 'ACME' } }] },
            { id: 'rm2', name: 'Azúcar', lots: [] },
        ]);
        const result = await getRawMaterials();
        expect(result[0].activeLot).toEqual(expect.objectContaining({ id: 'l1', lotNumber: 'A1', supplierName: 'ACME' }));
        expect(result[1].activeLot).toBeNull();
    });

    it('returns an empty array on error', async () => {
        mockRawMaterialFindMany.mockRejectedValue(new Error('db down'));
        expect(await getRawMaterials()).toEqual([]);
    });
});

describe('createRawMaterial', () => {
    it('requires RECEIVE_INVENTORY, trims the name, and rejects blank input', async () => {
        const result = await createRawMaterial('   ');
        expect(result.ok).toBe(false);
        expect(mockRawMaterialCreate).not.toHaveBeenCalled();
    });

    it('creates the raw material with the trimmed name', async () => {
        mockRawMaterialCreate.mockResolvedValue({ id: 'rm1' });
        const result = await createRawMaterial('  Café en grano  ');
        expect(result.ok).toBe(true);
        expect(mockRawMaterialCreate).toHaveBeenCalledWith({ data: { name: 'Café en grano' } });
    });
});

describe('receiveRawMaterialLot', () => {
    it('depletes the previous ACTIVE lot before creating the new one', async () => {
        tx.rawMaterialLot.create.mockResolvedValue({ id: 'l2' });
        const result = await receiveRawMaterialLot({ rawMaterialId: 'rm1', lotNumber: 'B2', supplierId: 'sup1' });
        expect(result.ok).toBe(true);
        expect(tx.rawMaterialLot.updateMany).toHaveBeenCalledWith({ where: { rawMaterialId: 'rm1', status: 'ACTIVE' }, data: { status: 'DEPLETED' } });
        expect(tx.rawMaterialLot.create).toHaveBeenCalledWith({ data: expect.objectContaining({ rawMaterialId: 'rm1', lotNumber: 'B2', createdById: 'mgr1', supplierId: 'sup1' }) });
    });
});

describe('markRawMaterialLotDepleted', () => {
    it('requires RECEIVE_INVENTORY and marks the lot DEPLETED', async () => {
        mockRawMaterialLotUpdate.mockResolvedValue({});
        const result = await markRawMaterialLotDepleted('l1');
        expect(result.ok).toBe(true);
        expect(mockRawMaterialLotUpdate).toHaveBeenCalledWith({ where: { id: 'l1' }, data: { status: 'DEPLETED' } });
    });
});

describe('getExpiringItems', () => {
    it('requires VIEW_DASHBOARD and merges + sorts product and raw-material lots by expiration', async () => {
        (prisma as any).productLot = { findMany: vi.fn().mockResolvedValue([
            { id: 'pl1', product: { name: 'Buldak' }, lotNumber: 'L1', expirationDate: new Date('2026-09-20'), quantityRemaining: 3 },
        ]) };
        (prisma as any).rawMaterialLot.findMany = vi.fn().mockResolvedValue([
            { id: 'rl1', rawMaterial: { name: 'Leche' }, lotNumber: null, expirationDate: new Date('2026-09-15') },
        ]);
        const result = await getExpiringItems(7);
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_DASHBOARD');
        expect(result).toHaveLength(2);
        expect(result[0].kind).toBe('raw-material'); // earlier expiration first
        expect(result[1].kind).toBe('product');
    });

    it('returns an empty array on error', async () => {
        (prisma as any).productLot = { findMany: vi.fn().mockRejectedValue(new Error('db down')) };
        (prisma as any).rawMaterialLot.findMany = vi.fn().mockResolvedValue([]);
        expect(await getExpiringItems()).toEqual([]);
    });
});

describe('getRawMaterialConsumptionReport', () => {
    it('requires VIEW_REPORTS and returns [] when no product references this insumo', async () => {
        (prisma as any).product.findMany = vi.fn().mockResolvedValue([]);
        (prisma as any).rawMaterialLot.findMany = vi.fn().mockResolvedValue([{ id: 'lot1' }]);
        const result: any = await getRawMaterialConsumptionReport('rm1');
        expect(mockRequirePermission).toHaveBeenCalledWith('VIEW_REPORTS');
        expect(result.ok).toBe(true);
        expect(result.data).toEqual([]);
    });

    it('returns [] when the insumo has no lots yet', async () => {
        (prisma as any).product.findMany = vi.fn().mockResolvedValue([{ id: 'p1', name: 'Café Americano' }]);
        (prisma as any).rawMaterialLot.findMany = vi.fn().mockResolvedValue([]);
        const result: any = await getRawMaterialConsumptionReport('rm1');
        expect(result.data).toEqual([]);
    });

    it('bounds each lot\'s sales window by the next lot\'s receivedDate, and aggregates by product', async () => {
        const lot1Start = new Date('2026-09-01T00:00:00Z');
        const lot2Start = new Date('2026-09-10T00:00:00Z');
        (prisma as any).product.findMany = vi.fn().mockResolvedValue([{ id: 'p1', name: 'Café Americano' }]);
        (prisma as any).rawMaterialLot.findMany = vi.fn().mockResolvedValue([
            { id: 'lot1', lotNumber: 'A', status: 'DEPLETED', receivedDate: lot1Start, updatedAt: lot2Start },
            { id: 'lot2', lotNumber: 'B', status: 'ACTIVE', receivedDate: lot2Start, updatedAt: lot2Start },
        ]);
        (prisma as any).saleDetail.findMany = vi.fn()
            .mockResolvedValueOnce([
                { productId: 'p1', quantity: 3, subtotal: 9000, saleId: 's1' },
                { productId: 'p1', quantity: 2, subtotal: 6000, saleId: 's2' },
            ])
            .mockResolvedValueOnce([
                { productId: 'p1', quantity: 1, subtotal: 3000, saleId: 's3' },
            ]);

        const result: any = await getRawMaterialConsumptionReport('rm1');
        expect(result.ok).toBe(true);
        // Most recent lot first.
        expect(result.data[0].lotId).toBe('lot2');
        expect(result.data[0].status).toBe('ACTIVE');
        expect(result.data[0].endDate).toBeNull();
        expect(result.data[0].totalQuantitySold).toBe(1);
        expect(result.data[0].saleCount).toBe(1);

        expect(result.data[1].lotId).toBe('lot1');
        expect(result.data[1].endDate).toBe(lot2Start.toISOString());
        expect(result.data[1].totalQuantitySold).toBe(5);
        expect(result.data[1].totalRevenue).toBe(15000);
        expect(result.data[1].saleCount).toBe(2);
        expect(result.data[1].byProduct).toEqual([{ productId: 'p1', productName: 'Café Americano', quantitySold: 5, revenue: 15000 }]);

        // Lot1's window query used [lot1Start, lot2Start).
        expect((prisma as any).saleDetail.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
            where: expect.objectContaining({ sale: expect.objectContaining({ createdAt: { gte: lot1Start, lt: lot2Start } }) }),
        }));
    });

    it('returns a failure result instead of throwing on a DB error', async () => {
        (prisma as any).product.findMany = vi.fn().mockRejectedValue(new Error('db down'));
        const result: any = await getRawMaterialConsumptionReport('rm1');
        expect(result.ok).toBe(false);
    });
});
