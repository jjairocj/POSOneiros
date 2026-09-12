import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockTransaction = vi.fn();
const mockProductLotFindMany = vi.fn();
const mockRawMaterialFindMany = vi.fn();
const mockRawMaterialCreate = vi.fn();
const mockRawMaterialLotUpdate = vi.fn();
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
        rawMaterialLot: { update: (...a: any[]) => mockRawMaterialLotUpdate(...a) },
    },
}));
vi.mock('@/lib/auth', () => ({ requirePermission: (...a: any[]) => mockRequirePermission(...a) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { receiveProductLot, getProductLots, getRawMaterials, createRawMaterial, receiveRawMaterialLot, markRawMaterialLotDepleted, getExpiringItems } from '../../app/actions/lots';
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
