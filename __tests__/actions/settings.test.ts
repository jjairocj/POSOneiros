import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFindMany = vi.fn();
const mockUpsert = vi.fn();
const mockRequireAdmin = vi.fn();

vi.mock('../../lib/prisma', () => ({
    default: {
        systemConfig: {
            findMany: (...a: any[]) => mockFindMany(...a),
            upsert: (...a: any[]) => mockUpsert(...a),
        },
    },
}));
vi.mock('../../lib/auth', () => ({
    requireAdmin: () => mockRequireAdmin(),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { getSettings, saveSettings, type SettingsData } from '../../app/actions/settings';

const validSettings = (overrides: Partial<SettingsData> = {}): SettingsData => ({
    businessName: 'Tienda Oneiros', businessNit: '900123', businessAddress: 'Calle 1',
    businessPhone: '3000000000', businessEmail: 'a@b.com',
    allowNegativeStock: 'false', defaultTaxIva: '19', currency: 'COP', cityCountry: 'Bogotá',
    receiptFooter: 'Gracias', showLogoOnReceipt: 'true', businessLogoUrl: 'https://x.com/logo.png',
    showTaxBreakdown: 'true', receiptWidthMm: '48',
    ...overrides,
});

beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin1', role: 'ADMIN' });
});

describe('getSettings', () => {
    it('does not require a session (read is public to the app)', async () => {
        mockFindMany.mockResolvedValue([]);
        await getSettings();
        expect(mockRequireAdmin).not.toHaveBeenCalled();
    });

    it('returns hard-coded defaults when no config rows exist', async () => {
        mockFindMany.mockResolvedValue([]);
        const s = await getSettings();
        expect(s).toMatchObject({ businessName: '', defaultTaxIva: '19', currency: 'COP', businessLogoUrl: '' });
    });

    it('overlays stored key/value rows on top of the defaults', async () => {
        mockFindMany.mockResolvedValue([
            { key: 'businessName', value: 'Tienda Oneiros' },
            { key: 'businessLogoUrl', value: 'https://x.com/logo.png' },
        ]);
        const s = await getSettings();
        expect(s.businessName).toBe('Tienda Oneiros');
        expect(s.businessLogoUrl).toBe('https://x.com/logo.png');
        expect(s.defaultTaxIva).toBe('19'); // untouched default
    });

    it('falls back to defaults on a DB error instead of throwing', async () => {
        mockFindMany.mockRejectedValue(new Error('down'));
        const s = await getSettings();
        expect(s.currency).toBe('COP');
    });
});

describe('saveSettings', () => {
    it('requires ADMIN', async () => {
        mockRequireAdmin.mockRejectedValue(Object.assign(new Error('No tienes permisos para esta acción'), { name: 'AuthError' }));
        const res = await saveSettings(validSettings());
        expect(res).toEqual({ success: false, error: 'No tienes permisos para esta acción' });
        expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('rejects a defaultTaxIva outside 0-100 without writing anything', async () => {
        expect(await saveSettings(validSettings({ defaultTaxIva: '150' }))).toEqual({ success: false, error: 'El IVA por defecto debe estar entre 0 y 100.' });
        expect(await saveSettings(validSettings({ defaultTaxIva: '-5' }))).toMatchObject({ success: false });
        expect(await saveSettings(validSettings({ defaultTaxIva: 'abc' }))).toMatchObject({ success: false });
        expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('rejects a logo URL that is not https://', async () => {
        const res = await saveSettings(validSettings({ businessLogoUrl: 'http://insecure.com/logo.png' }));
        expect(res).toEqual({ success: false, error: 'La URL del logo debe empezar con https://.' });
        expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('allows an empty logo URL (feature simply off)', async () => {
        mockUpsert.mockResolvedValue({});
        const res = await saveSettings(validSettings({ businessLogoUrl: '' }));
        expect(res).toEqual({ success: true });
    });

    it('upserts every allowed key as a SystemConfig row', async () => {
        mockUpsert.mockResolvedValue({});
        const data = validSettings();
        const res = await saveSettings(data);
        expect(res).toEqual({ success: true });
        expect(mockUpsert).toHaveBeenCalledTimes(Object.keys(data).length);
        expect(mockUpsert).toHaveBeenCalledWith({
            where: { key: 'businessName' },
            update: { value: 'Tienda Oneiros' },
            create: { key: 'businessName', value: 'Tienda Oneiros' },
        });
    });

    it('silently drops any key that is not part of SettingsData', async () => {
        mockUpsert.mockResolvedValue({});
        const data = { ...validSettings(), notARealSetting: 'hack' } as unknown as SettingsData;
        await saveSettings(data);
        expect(mockUpsert).not.toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'notARealSetting' } }));
    });

    it('reports a friendly error when a write fails', async () => {
        mockUpsert.mockRejectedValue(new Error('down'));
        const res = await saveSettings(validSettings());
        expect(res.success).toBe(false);
        expect(res.error).toBeTruthy();
    });
});
