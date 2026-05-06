import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockCreate = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        customer: {
            findMany: (...a: any[]) => mockFindMany(...a),
            create: (...a: any[]) => mockCreate(...a),
        },
    },
}));

import { searchCustomers, createCustomer } from '../../app/actions/customers';

beforeEach(() => vi.clearAllMocks());

describe('searchCustomers', () => {
    it('returns empty array for queries shorter than 2 chars', async () => {
        expect(await searchCustomers('')).toEqual([]);
        expect(await searchCustomers('a')).toEqual([]);
        expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('queries prisma with correct where clause', async () => {
        mockFindMany.mockResolvedValue([]);
        await searchCustomers('Juan');
        expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ OR: expect.any(Array) }),
            take: 8,
        }));
    });

    it('returns up to 8 results', async () => {
        const fakeCustomers = Array.from({ length: 8 }, (_, i) => ({
            id: `c${i}`, fullName: `Cliente ${i}`, documentId: null, phone: null, email: null,
        }));
        mockFindMany.mockResolvedValue(fakeCustomers);
        const result = await searchCustomers('Cliente');
        expect(result).toHaveLength(8);
    });
});

describe('createCustomer', () => {
    it('creates a customer and returns the result', async () => {
        const fake = { id: 'c1', fullName: 'María López', documentId: null, phone: null, email: null };
        mockCreate.mockResolvedValue(fake);
        const result = await createCustomer({ fullName: 'María López' });
        expect(result.fullName).toBe('María López');
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ fullName: 'María López' }),
        }));
    });

    it('trims whitespace from fullName', async () => {
        mockCreate.mockResolvedValue({ id: 'c2', fullName: 'Ana', documentId: null, phone: null, email: null });
        await createCustomer({ fullName: '  Ana  ' });
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ fullName: 'Ana' }),
        }));
    });

    it('sets empty optional fields to null', async () => {
        mockCreate.mockResolvedValue({ id: 'c3', fullName: 'Pedro', documentId: null, phone: null, email: null });
        await createCustomer({ fullName: 'Pedro', documentId: '', phone: '' });
        expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ documentId: null, phone: null }),
        }));
    });
});
