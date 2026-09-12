import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserFindMany = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserDelete = vi.fn();
const mockUserCount = vi.fn();
const mockRoleFindMany = vi.fn();
const mockRoleFindUnique = vi.fn();
const mockBranchFindMany = vi.fn();
const mockShiftCount = vi.fn();
const mockRequireSession = vi.fn();
const mockRequireAdmin = vi.fn();
const mockBcryptHash = vi.fn();
const mockBcryptCompare = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        user: {
            findMany: (...a: any[]) => mockUserFindMany(...a),
            findUnique: (...a: any[]) => mockUserFindUnique(...a),
            create: (...a: any[]) => mockUserCreate(...a),
            update: (...a: any[]) => mockUserUpdate(...a),
            delete: (...a: any[]) => mockUserDelete(...a),
            count: (...a: any[]) => mockUserCount(...a),
        },
        role: {
            findMany: (...a: any[]) => mockRoleFindMany(...a),
            findUnique: (...a: any[]) => mockRoleFindUnique(...a),
        },
        branch: { findMany: (...a: any[]) => mockBranchFindMany(...a) },
        shift: { count: (...a: any[]) => mockShiftCount(...a) },
    },
}));
vi.mock('@/lib/auth', () => ({
    requireSession: (...a: any[]) => mockRequireSession(...a),
    requireAdmin: (...a: any[]) => mockRequireAdmin(...a),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('bcryptjs', () => ({
    default: { hash: (...a: any[]) => mockBcryptHash(...a), compare: (...a: any[]) => mockBcryptCompare(...a) },
}));

import { getUsers, createUser, updateUser, deleteUser, getRoles, getBranches, changeOwnPassword } from '../../app/actions/users';

const iso = () => new Date().toISOString();
const makeUser = (overrides: object = {}) => ({
    id: 'u1', name: 'Jhon', email: 'jhon@x.com', password: 'hashed', roleId: 'role-cashier',
    createdAt: new Date(), updatedAt: new Date(),
    role: { id: 'role-cashier', name: 'CASHIER', permissions: [], createdAt: new Date(), updatedAt: new Date() },
    branch: null,
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
    mockBcryptHash.mockResolvedValue('hashed-pw');
});

describe('getUsers', () => {
    it('requires ADMIN and serializes nested dates', async () => {
        mockUserFindMany.mockResolvedValue([makeUser()]);
        const result = await getUsers();
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(result[0].createdAt).toBe(typeof result[0].createdAt === 'string' ? result[0].createdAt : iso());
        expect(typeof result[0].role.createdAt).toBe('string');
    });

    it('keeps branch null when the user has none', async () => {
        mockUserFindMany.mockResolvedValue([makeUser({ branch: null })]);
        const result = await getUsers();
        expect(result[0].branch).toBeNull();
    });

    it('returns an empty array on error', async () => {
        mockUserFindMany.mockRejectedValue(new Error('db down'));
        expect(await getUsers()).toEqual([]);
    });
});

describe('createUser', () => {
    const valid = { name: 'Ana', email: 'ana@x.com', password: 'secret1', roleId: 'role-cashier' };

    it('requires ADMIN, hashes the password, and creates the user', async () => {
        mockUserCreate.mockResolvedValue(makeUser());
        const result = await createUser(valid);
        expect(result.success).toBe(true);
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(mockBcryptHash).toHaveBeenCalledWith('secret1', 12);
        expect(mockUserCreate).toHaveBeenCalledWith({ data: { name: 'Ana', email: 'ana@x.com', password: 'hashed-pw', roleId: 'role-cashier', branchId: null } });
    });

    it('lowercases and trims the email', async () => {
        mockUserCreate.mockResolvedValue(makeUser());
        await createUser({ ...valid, email: '  Ana@X.com  ' });
        expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'ana@x.com' }) }));
    });

    it('rejects a blank name', async () => {
        const result = await createUser({ ...valid, name: '  ' });
        expect(result.success).toBe(false);
        expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it('rejects an invalid email', async () => {
        const result = await createUser({ ...valid, email: 'not-an-email' });
        expect(result.success).toBe(false);
        expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it('rejects a password shorter than 6 characters', async () => {
        const result = await createUser({ ...valid, password: '123' });
        expect(result.success).toBe(false);
        expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it('rejects a missing roleId', async () => {
        const result = await createUser({ ...valid, roleId: '' });
        expect(result.success).toBe(false);
        expect(mockUserCreate).not.toHaveBeenCalled();
    });
});

describe('updateUser', () => {
    const valid = { name: 'Ana', email: 'ana@x.com', roleId: 'role-cashier' };

    beforeEach(() => {
        mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
    });

    it('updates without touching the password when none is given', async () => {
        mockUserUpdate.mockResolvedValue(makeUser());
        const result = await updateUser('u1', valid);
        expect(result.success).toBe(true);
        expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { name: 'Ana', email: 'ana@x.com', roleId: 'role-cashier', branchId: null } });
        expect(mockBcryptHash).not.toHaveBeenCalled();
    });

    it('rehashes and stamps passwordChangedAt when a new password is given', async () => {
        mockUserUpdate.mockResolvedValue(makeUser());
        await updateUser('u1', { ...valid, password: 'newpass1' });
        expect(mockBcryptHash).toHaveBeenCalledWith('newpass1', 12);
        const call = mockUserUpdate.mock.calls[0][0];
        expect(call.data.password).toBe('hashed-pw');
        expect(call.data.passwordChangedAt).toBeInstanceOf(Date);
    });

    it('rejects a too-short new password', async () => {
        const result = await updateUser('u1', { ...valid, password: '123' });
        expect(result.success).toBe(false);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('blocks an admin from demoting themselves away from the ADMIN role', async () => {
        mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
        mockRoleFindUnique.mockResolvedValue({ id: 'role-admin', name: 'ADMIN' });
        const result = await updateUser('admin1', { ...valid, roleId: 'role-cashier' });
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/no puedes quitarte/i);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('allows an admin to update their own account without changing role', async () => {
        mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
        mockRoleFindUnique.mockResolvedValue({ id: 'role-admin', name: 'ADMIN' });
        mockUserUpdate.mockResolvedValue(makeUser());
        const result = await updateUser('admin1', { ...valid, roleId: 'role-admin' });
        expect(result.success).toBe(true);
    });
});

describe('deleteUser', () => {
    it('blocks deleting your own account', async () => {
        mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
        const result = await deleteUser('admin1');
        expect(result.success).toBe(false);
        expect(mockUserDelete).not.toHaveBeenCalled();
    });

    it('blocks deleting the last ADMIN', async () => {
        mockUserFindUnique.mockResolvedValue({ role: { name: 'ADMIN' } });
        mockUserCount.mockResolvedValue(1);
        const result = await deleteUser('u2');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/último administrador/i);
        expect(mockUserDelete).not.toHaveBeenCalled();
    });

    it('allows deleting an ADMIN when another ADMIN remains', async () => {
        mockUserFindUnique.mockResolvedValue({ role: { name: 'ADMIN' } });
        mockUserCount.mockResolvedValue(2);
        mockShiftCount.mockResolvedValue(0);
        mockUserDelete.mockResolvedValue(makeUser());
        const result = await deleteUser('u2');
        expect(result.success).toBe(true);
    });

    it('blocks deleting a user with shift history', async () => {
        mockUserFindUnique.mockResolvedValue({ role: { name: 'CASHIER' } });
        mockShiftCount.mockResolvedValue(5);
        const result = await deleteUser('u2');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/turnos registrados/i);
        expect(mockUserDelete).not.toHaveBeenCalled();
    });

    it('deletes a non-admin user with no shift history', async () => {
        mockUserFindUnique.mockResolvedValue({ role: { name: 'CASHIER' } });
        mockShiftCount.mockResolvedValue(0);
        mockUserDelete.mockResolvedValue(makeUser());
        const result = await deleteUser('u2');
        expect(result.success).toBe(true);
        expect(mockUserDelete).toHaveBeenCalledWith({ where: { id: 'u2' } });
    });
});

describe('getRoles / getBranches', () => {
    it('getRoles requires ADMIN and serializes dates', async () => {
        mockRoleFindMany.mockResolvedValue([{ id: 'r1', name: 'ADMIN', permissions: [], createdAt: new Date(), updatedAt: new Date() }]);
        const result = await getRoles();
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(typeof result[0].createdAt).toBe('string');
    });

    it('getRoles returns [] on error', async () => {
        mockRoleFindMany.mockRejectedValue(new Error('db down'));
        expect(await getRoles()).toEqual([]);
    });

    it('getBranches requires ADMIN and serializes dates', async () => {
        mockBranchFindMany.mockResolvedValue([{ id: 'b1', name: 'Principal', address: null, createdAt: new Date(), updatedAt: new Date() }]);
        const result = await getBranches();
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(typeof result[0].createdAt).toBe('string');
    });

    it('getBranches returns [] on error', async () => {
        mockBranchFindMany.mockRejectedValue(new Error('db down'));
        expect(await getBranches()).toEqual([]);
    });
});

describe('changeOwnPassword', () => {
    beforeEach(() => {
        mockRequireSession.mockResolvedValue({ id: 'me1' });
        mockUserFindUnique.mockResolvedValue({ id: 'me1', password: 'old-hashed' });
    });

    it('requires the current session and validates the current password', async () => {
        mockBcryptCompare.mockResolvedValue(true);
        mockUserUpdate.mockResolvedValue({});
        const result = await changeOwnPassword('oldpass', 'newpass1');
        expect(mockRequireSession).toHaveBeenCalled();
        expect(mockBcryptCompare).toHaveBeenCalledWith('oldpass', 'old-hashed');
        expect(result.success).toBe(true);
        expect(mockUserUpdate).toHaveBeenCalledWith({ where: { id: 'me1' }, data: expect.objectContaining({ password: 'hashed-pw' }) });
    });

    it('rejects when the current password is wrong', async () => {
        mockBcryptCompare.mockResolvedValue(false);
        const result = await changeOwnPassword('wrong', 'newpass1');
        expect(result.success).toBe(false);
        expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it('rejects a new password shorter than 6 characters', async () => {
        const result = await changeOwnPassword('oldpass', '123');
        expect(result.success).toBe(false);
        expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('rejects when the new password matches the current one literally', async () => {
        const result = await changeOwnPassword('samepass', 'samepass');
        expect(result.success).toBe(false);
        expect(mockBcryptCompare).not.toHaveBeenCalled();
    });

    it('fails gracefully if the user record is missing', async () => {
        mockUserFindUnique.mockResolvedValue(null);
        const result = await changeOwnPassword('oldpass', 'newpass1');
        expect(result.success).toBe(false);
    });
});
