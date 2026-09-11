import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockConditionDeleteMany = vi.fn();
const mockTransaction = vi.fn();
const mockRequirePermission = vi.fn();
const mockRequireSession = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        promotion: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
            update: (...a: any[]) => mockUpdate(...a),
            delete: (...a: any[]) => mockDelete(...a),
        },
        promotionCondition: { deleteMany: (...a: any[]) => mockConditionDeleteMany(...a) },
        $transaction: (...a: any[]) => mockTransaction(...a),
    },
}));
vi.mock('../../lib/auth', () => ({
    requirePermission: (...a: any[]) => mockRequirePermission(...a),
    requireSession: (...a: any[]) => mockRequireSession(...a),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import {
    createPromotion, updatePromotion, deletePromotion, togglePromotionActive,
    getPromotions, getActivePromotionRules, type PromotionInput,
} from '../../app/actions/promotions';

const FREE_ITEM_INPUT: PromotionInput = {
    name: 'Agua gratis', isActive: true, priority: 0, startDate: null, endDate: null,
    conditions: [{ productId: 'p1', familyId: null, minQuantity: 2 }],
    effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'p2', targetFamilyId: null, value: null, targetQuantity: 1 },
};

beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
    mockRequireSession.mockResolvedValue({ id: 'u1', role: 'CASHIER' });
    mockTransaction.mockImplementation(async (fn: any) => fn({
        promotion: { update: mockUpdate },
        promotionCondition: { deleteMany: mockConditionDeleteMany },
    }));
});

describe('createPromotion — validation', () => {
    it('requires MANAGE_CATALOG', async () => {
        await createPromotion(FREE_ITEM_INPUT);
        expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_CATALOG');
    });

    it('rejects a blank name', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, name: '  ' });
        expect(res).toEqual({ ok: false, error: 'El nombre es obligatorio.' });
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('rejects no conditions', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, conditions: [] });
        expect(res.ok).toBe(false);
        expect(res.ok === false && res.error).toMatch(/al menos una condición/);
    });

    it('rejects a condition with neither product nor family', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, conditions: [{ minQuantity: 1 }] });
        expect(res.ok).toBe(false);
    });

    it('rejects a condition with both product and family', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, conditions: [{ productId: 'p1', familyId: 'f1', minQuantity: 1 }] });
        expect(res.ok).toBe(false);
    });

    it('rejects minQuantity <= 0', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, conditions: [{ productId: 'p1', minQuantity: 0 }] });
        expect(res.ok).toBe(false);
    });

    it('rejects a PRODUCT target with no product selected', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, effect: { ...FREE_ITEM_INPUT.effect, targetProductId: null } });
        expect(res.ok).toBe(false);
    });

    it('rejects a percent-off value above 100', async () => {
        const res = await createPromotion({
            ...FREE_ITEM_INPUT,
            effect: { type: 'PERCENT_OFF', targetType: 'PRODUCT', targetProductId: 'p2', targetFamilyId: null, value: 150, targetQuantity: 1 },
        });
        expect(res.ok).toBe(false);
    });

    it('rejects a non-FREE_ITEM effect with no positive value', async () => {
        const res = await createPromotion({
            ...FREE_ITEM_INPUT,
            effect: { type: 'FIXED_PRICE', targetType: 'PRODUCT', targetProductId: 'p2', targetFamilyId: null, value: 0, targetQuantity: 1 },
        });
        expect(res.ok).toBe(false);
    });

    it('rejects startDate after endDate', async () => {
        const res = await createPromotion({ ...FREE_ITEM_INPUT, startDate: '2026-06-01', endDate: '2026-01-01' });
        expect(res.ok).toBe(false);
    });

    it('creates a promotion with nested conditions and effect', async () => {
        mockCreate.mockResolvedValue({ id: 'promo1' });
        const res = await createPromotion(FREE_ITEM_INPUT);
        expect(res.ok).toBe(true);
        expect(mockCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                name: 'Agua gratis', isActive: true, priority: 0,
                conditions: { create: [{ productId: 'p1', familyId: null, minQuantity: 2 }] },
                effect: { create: expect.objectContaining({ type: 'FREE_ITEM', targetProductId: 'p2', value: null, targetQuantity: 1 }) },
            }),
        });
    });

    it('nulls out value for FREE_ITEM even if the client sent one', async () => {
        mockCreate.mockResolvedValue({ id: 'promo1' });
        await createPromotion({ ...FREE_ITEM_INPUT, effect: { ...FREE_ITEM_INPUT.effect, value: 999 } });
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ effect: { create: expect.objectContaining({ value: null }) } }),
        }));
    });
});

describe('updatePromotion', () => {
    it('replaces conditions and upserts the effect inside a transaction', async () => {
        mockUpdate.mockResolvedValue({ id: 'promo1' });
        const res = await updatePromotion('promo1', FREE_ITEM_INPUT);
        expect(res.ok).toBe(true);
        expect(mockRequirePermission).toHaveBeenCalledWith('MANAGE_CATALOG');
        expect(mockConditionDeleteMany).toHaveBeenCalledWith({ where: { promotionId: 'promo1' } });
        expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'promo1' } }));
    });

    it('rejects invalid input without touching the database', async () => {
        const res = await updatePromotion('promo1', { ...FREE_ITEM_INPUT, name: '' });
        expect(res.ok).toBe(false);
        expect(mockTransaction).not.toHaveBeenCalled();
    });
});

describe('deletePromotion / togglePromotionActive', () => {
    it('deletes by id', async () => {
        mockDelete.mockResolvedValue({});
        const res = await deletePromotion('promo1');
        expect(res.ok).toBe(true);
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'promo1' } });
    });

    it('toggles isActive', async () => {
        mockUpdate.mockResolvedValue({});
        const res = await togglePromotionActive('promo1', false);
        expect(res.ok).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'promo1' }, data: { isActive: false } });
    });
});

describe('getPromotions / getActivePromotionRules', () => {
    it('getPromotions resolves product/family display names', async () => {
        mockFindMany.mockResolvedValue([{
            id: 'promo1', name: 'Agua gratis', isActive: true, priority: 0, startDate: null, endDate: null,
            conditions: [{ id: 'c1', productId: 'p1', product: { name: 'Buldak' }, familyId: null, family: null, minQuantity: 2 }],
            effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'p2', targetProduct: { name: 'Agua' }, targetFamilyId: null, targetFamily: null, value: null, targetQuantity: 1 },
        }]);
        const rows = await getPromotions();
        expect(rows[0].conditions[0].productName).toBe('Buldak');
        expect(rows[0].effect?.targetProductName).toBe('Agua');
    });

    it('getActivePromotionRules only requires a session, and skips promotions with no effect', async () => {
        mockFindMany.mockResolvedValue([
            { id: 'promo1', name: 'A', isActive: true, priority: 0, startDate: null, endDate: null, conditions: [], effect: null },
            { id: 'promo2', name: 'B', isActive: true, priority: 1, startDate: null, endDate: null, conditions: [{ productId: 'p1', familyId: null, minQuantity: 1 }], effect: { type: 'FREE_ITEM', targetType: 'PRODUCT', targetProductId: 'p2', targetFamilyId: null, value: null, targetQuantity: 1 } },
        ]);
        const rules = await getActivePromotionRules();
        expect(mockRequireSession).toHaveBeenCalled();
        expect(mockRequirePermission).not.toHaveBeenCalled();
        expect(rules).toHaveLength(1);
        expect(rules[0].id).toBe('promo2');
    });

    it('returns an empty array on a DB error instead of throwing', async () => {
        mockFindMany.mockRejectedValue(new Error('down'));
        expect(await getPromotions()).toEqual([]);
        expect(await getActivePromotionRules()).toEqual([]);
    });
});
