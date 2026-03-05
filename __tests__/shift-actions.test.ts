import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openShift, getActiveShift, closeShift } from '../app/actions/shift';
import prisma from '../lib/prisma';
import { getServerSession } from 'next-auth/next';

// Mocking dependencies
vi.mock('../lib/prisma', () => ({
    default: {
        shift: {
            findFirst: vi.fn(),
            findUnique: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
        },
        register: {
            findFirst: vi.fn(),
        }
    },
}));

vi.mock('next-auth/next', () => ({
    getServerSession: vi.fn(),
}));

describe('Shift Actions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getActiveShift', () => {
        it('should return null if no session exists', async () => {
            (getServerSession as any).mockResolvedValue(null);
            const result = await getActiveShift();
            expect(result).toBeNull();
        });

        it('should return the shift if an open shift exists', async () => {
            const mockSession = { user: { email: 'test@test.com' } };
            const mockShift = { id: '1', status: 'OPEN' };

            (getServerSession as any).mockResolvedValue(mockSession);
            (prisma.shift.findFirst as any).mockResolvedValue(mockShift);

            const result = await getActiveShift();
            expect(result).toEqual(mockShift);
            expect(prisma.shift.findFirst).toHaveBeenCalledWith(expect.objectContaining({
                where: { status: 'OPEN' }
            }));
        });
    });

    describe('openShift', () => {
        it('should throw error if not authenticated', async () => {
            (getServerSession as unknown as any).mockResolvedValue(null);
            await expect(openShift(100, 'reg_1')).rejects.toThrow('No autenticado');
        });

        it('should create a new shift with correct data', async () => {
            const mockSession = { user: { id: 'user_1' } };
            const mockRegister = { id: 'reg_1' };
            const mockNewShift = { id: 'shift_1', baseAmount: 100, userId: 'user_1', registerId: 'reg_1' };

            (getServerSession as unknown as any).mockResolvedValue(mockSession);
            (prisma.register.findFirst as unknown as any).mockResolvedValue(mockRegister);
            (prisma.shift.create as unknown as any).mockResolvedValue(mockNewShift);

            const result = await openShift(100, 'reg_1');

            expect(result).toEqual(mockNewShift);
            expect(prisma.shift.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    baseAmount: 100,
                    status: 'OPEN',
                    registerId: 'reg_1'
                })
            }));
        });
    });

    describe('closeShift', () => {
        it('should throw error if not authenticated', async () => {
            (getServerSession as unknown as any).mockResolvedValue(null);
            await expect(closeShift('shift_1', 500)).rejects.toThrow('No autenticado');
        });

        it('should calculate difference and update shift', async () => {
            const mockSession = { user: { id: 'user_1' } };
            const mockShift = {
                id: 'shift_1',
                userId: 'user_1',
                status: 'OPEN',
                baseAmount: 100,
                sales: [
                    { total: 200 },
                    { total: 300 }
                ]
            };
            const expectedTotal = 100 + 200 + 300; // 600

            (getServerSession as unknown as any).mockResolvedValue(mockSession);
            (prisma.shift.findUnique as unknown as any).mockResolvedValue(mockShift);

            const mockUpdate = { ...mockShift, status: 'CLOSED', closeAmount: 600 };
            (prisma.shift.update as unknown as any).mockResolvedValue(mockUpdate);

            const result = await closeShift('shift_1', 600);

            expect(result.summary.expected).toBe(expectedTotal);
            expect(result.summary.declared).toBe(600);
            expect(result.summary.difference).toBe(0); // 600 - 600 = 0
            expect(result.summary.totalSales).toBe(500);

            expect(prisma.shift.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 'shift_1' },
                data: expect.objectContaining({
                    status: 'CLOSED',
                    closeAmount: 600,
                })
            }));
        });

        it('should report correct shortage (descuadre)', async () => {
            const mockSession = { user: { id: 'user_1' } };
            const mockShift = {
                id: 'shift_1',
                userId: 'user_1',
                status: 'OPEN',
                baseAmount: 100,
                sales: [{ total: 400 }]
            };
            // Expected: 500

            (getServerSession as unknown as any).mockResolvedValue(mockSession);
            (prisma.shift.findUnique as unknown as any).mockResolvedValue(mockShift);
            (prisma.shift.update as unknown as any).mockResolvedValue({});

            // Declaring ONLY 450, should be short by 50
            const result = await closeShift('shift_1', 450);

            expect(result.summary.expected).toBe(500);
            expect(result.summary.declared).toBe(450);
            expect(result.summary.difference).toBe(-50);
        });
    });
});
