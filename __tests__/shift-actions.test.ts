import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openShift, getActiveShift } from '../app/actions/shift';
import prisma from '../lib/prisma';
import { getServerSession } from 'next-auth/next';

// Mocking dependencies
vi.mock('../lib/prisma', () => ({
    default: {
        shift: {
            findFirst: vi.fn(),
            create: vi.fn(),
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
            (getServerSession as any).mockResolvedValue(null);
            await expect(openShift(100)).rejects.toThrow('No autenticado');
        });

        it('should create a new shift with correct data', async () => {
            const mockSession = { user: { email: 'test@test.com' } };
            const mockRegister = { id: 'reg_1' };
            const mockNewShift = { id: 'shift_1', baseAmount: 100 };

            (getServerSession as any).mockResolvedValue(mockSession);
            (prisma.register.findFirst as any).mockResolvedValue(mockRegister);
            (prisma.shift.create as any).mockResolvedValue(mockNewShift);

            const result = await openShift(100);

            expect(result).toEqual(mockNewShift);
            expect(prisma.shift.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    baseAmount: 100,
                    status: 'OPEN'
                })
            }));
        });
    });
});
