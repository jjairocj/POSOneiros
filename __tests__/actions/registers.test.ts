import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockShiftFindFirst = vi.fn();
const mockShiftCount = vi.fn();
const mockRequireAdmin = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        register: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
            update: (...a: any[]) => mockUpdate(...a),
            delete: (...a: any[]) => mockDelete(...a),
        },
        shift: {
            findFirst: (...a: any[]) => mockShiftFindFirst(...a),
            count: (...a: any[]) => mockShiftCount(...a),
        },
    },
}));
vi.mock('@/lib/auth', () => ({
    requireSession: vi.fn(),
    requireAdmin: (...a: any[]) => mockRequireAdmin(...a),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getRegisters, createRegister, updateRegister, deleteRegister } from '../../app/actions/registers';

const makeBranch = () => ({ id: 'b1', name: 'Sucursal Principal', address: null, createdAt: new Date(), updatedAt: new Date() });
const makeRegister = (overrides: object = {}) => ({
    id: 'r1', name: 'Caja Principal', prefix: 'POS', branchId: 'b1', nextNumber: 1,
    createdAt: new Date(), updatedAt: new Date(), branch: makeBranch(),
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
});

describe('getRegisters', () => {
    it('requires ADMIN and serializes dates to ISO strings', async () => {
        const register = makeRegister();
        mockFindMany.mockResolvedValue([register]);
        const result = await getRegisters();
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(result[0].createdAt).toBe(register.createdAt.toISOString());
        expect(result[0].branch.createdAt).toBe(register.branch.createdAt.toISOString());
    });

    it('returns an empty array on error instead of throwing', async () => {
        mockFindMany.mockRejectedValue(new Error('db down'));
        const result = await getRegisters();
        expect(result).toEqual([]);
    });

    it('returns an empty array when requireAdmin rejects', async () => {
        mockRequireAdmin.mockRejectedValue(new Error('not admin'));
        const result = await getRegisters();
        expect(result).toEqual([]);
    });
});

describe('createRegister', () => {
    it('requires ADMIN and creates with a null prefix when omitted', async () => {
        mockCreate.mockResolvedValue(makeRegister());
        const result = await createRegister({ name: 'Caja 2', branchId: 'b1' });
        expect(result.success).toBe(true);
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(mockCreate).toHaveBeenCalledWith({ data: { name: 'Caja 2', prefix: null, branchId: 'b1' } });
    });

    it('rejects a blank name', async () => {
        const result = await createRegister({ name: '   ', branchId: 'b1' });
        expect(result.success).toBe(false);
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('returns a friendly error when the DB call throws', async () => {
        mockCreate.mockRejectedValue(new Error('db down'));
        const result = await createRegister({ name: 'Caja 2', branchId: 'b1' });
        expect(result.success).toBe(false);
    });
});

describe('updateRegister', () => {
    it('requires ADMIN and updates by id', async () => {
        mockUpdate.mockResolvedValue(makeRegister());
        const result = await updateRegister('r1', { name: 'Caja Renombrada', branchId: 'b1' });
        expect(result.success).toBe(true);
        expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { name: 'Caja Renombrada', prefix: null, branchId: 'b1' } });
    });

    it('rejects a blank name', async () => {
        const result = await updateRegister('r1', { name: '', branchId: 'b1' });
        expect(result.success).toBe(false);
        expect(mockUpdate).not.toHaveBeenCalled();
    });
});

describe('deleteRegister', () => {
    it('blocks deletion when the register has an OPEN shift', async () => {
        mockShiftFindFirst.mockResolvedValue({ id: 's1', status: 'OPEN' });
        const result = await deleteRegister('r1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/turno activo/i);
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('blocks deletion when the register has any shift history', async () => {
        mockShiftFindFirst.mockResolvedValue(null);
        mockShiftCount.mockResolvedValue(3);
        const result = await deleteRegister('r1');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/turnos registrados/i);
        expect(mockDelete).not.toHaveBeenCalled();
    });

    it('deletes a register with no shift history', async () => {
        mockShiftFindFirst.mockResolvedValue(null);
        mockShiftCount.mockResolvedValue(0);
        mockDelete.mockResolvedValue(makeRegister());
        const result = await deleteRegister('r1');
        expect(result.success).toBe(true);
        expect(mockDelete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('requires ADMIN', async () => {
        mockShiftFindFirst.mockResolvedValue(null);
        mockShiftCount.mockResolvedValue(0);
        await deleteRegister('r1');
        expect(mockRequireAdmin).toHaveBeenCalled();
    });
});
