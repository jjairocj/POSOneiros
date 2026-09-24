import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRequirePermission = vi.fn();
vi.mock('@/lib/auth', () => ({ requirePermission: (...a: any[]) => mockRequirePermission(...a) }));

const mockUploadProductImage = vi.fn();
vi.mock('@/app/lib/s3', () => ({ uploadProductImage: (...a: any[]) => mockUploadProductImage(...a) }));

import { uploadProductImageAction } from '../../app/actions/upload';

beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
});

describe('uploadProductImageAction', () => {
    it('requires MANAGE_CATALOG permission', async () => {
        mockRequirePermission.mockRejectedValue(Object.assign(new Error('No autorizado'), { name: 'AuthError' }));
        const fd = new FormData();
        fd.set('file', new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }));
        const res = await uploadProductImageAction(fd);
        expect(res.ok).toBe(false);
        expect(mockUploadProductImage).not.toHaveBeenCalled();
    });

    it('fails when no file is present', async () => {
        const res = await uploadProductImageAction(new FormData());
        expect(res).toEqual({ ok: false, error: 'Selecciona una imagen.' });
    });

    it('fails when the file is empty', async () => {
        const fd = new FormData();
        fd.set('file', new File([], 'empty.jpg', { type: 'image/jpeg' }));
        const res = await uploadProductImageAction(fd);
        expect(res).toEqual({ ok: false, error: 'Selecciona una imagen.' });
    });

    it('returns the uploaded URL on success', async () => {
        mockUploadProductImage.mockResolvedValue('https://storage.example.com/oneiros/products/abc.jpg');
        const fd = new FormData();
        fd.set('file', new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }));
        const res = await uploadProductImageAction(fd);
        expect(res).toEqual({ ok: true, data: { url: 'https://storage.example.com/oneiros/products/abc.jpg' } });
    });

    it('surfaces the UserError message from uploadProductImage', async () => {
        mockUploadProductImage.mockRejectedValue(Object.assign(new Error('La imagen no puede pesar más de 5 MB.'), { name: 'UserError' }));
        const fd = new FormData();
        fd.set('file', new File([new Uint8Array(10)], 'a.jpg', { type: 'image/jpeg' }));
        const res = await uploadProductImageAction(fd);
        expect(res).toEqual({ ok: false, error: 'La imagen no puede pesar más de 5 MB.' });
    });
});
