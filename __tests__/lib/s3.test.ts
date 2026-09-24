import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();
vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: class { send(...a: any[]) { return mockSend(...a); } },
    PutObjectCommand: class { input: any; constructor(input: any) { this.input = input; } },
}));

const ENV_KEYS = ['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_BUCKET', 'S3_PUBLIC_URL'];
const ORIGINAL_ENV: Record<string, string | undefined> = {};

function setConfigured() {
    process.env.S3_ENDPOINT = 'http://minio.local:9000';
    process.env.S3_ACCESS_KEY_ID = 'key';
    process.env.S3_SECRET_ACCESS_KEY = 'secret';
    process.env.S3_BUCKET = 'oneiros';
    process.env.S3_PUBLIC_URL = 'https://storage.example.com/';
}

function makeFile(bytes: number, type: string, name = 'photo.jpg'): File {
    return new File([new Uint8Array(bytes)], name, { type });
}

beforeEach(() => {
    for (const k of ENV_KEYS) ORIGINAL_ENV[k] = process.env[k];
    for (const k of ENV_KEYS) delete process.env[k];
    mockSend.mockReset();
    vi.resetModules();
});

afterEach(() => {
    for (const k of ENV_KEYS) {
        if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
        else process.env[k] = ORIGINAL_ENV[k];
    }
});

describe('isStorageConfigured', () => {
    it('is false when any S3_* env var is missing', async () => {
        const { isStorageConfigured } = await import('../../app/lib/s3');
        expect(isStorageConfigured()).toBe(false);
    });

    it('is true once all five env vars are set', async () => {
        setConfigured();
        const { isStorageConfigured } = await import('../../app/lib/s3');
        expect(isStorageConfigured()).toBe(true);
    });
});

describe('uploadProductImage', () => {
    it('rejects when storage is not configured', async () => {
        const { uploadProductImage } = await import('../../app/lib/s3');
        await expect(uploadProductImage(makeFile(100, 'image/jpeg'))).rejects.toThrow(/no está configurado/);
    });

    it('rejects a file over 5MB', async () => {
        setConfigured();
        const { uploadProductImage, MAX_UPLOAD_BYTES } = await import('../../app/lib/s3');
        await expect(uploadProductImage(makeFile(MAX_UPLOAD_BYTES + 1, 'image/jpeg'))).rejects.toThrow(/5 MB/);
    });

    it('rejects an unsupported content type', async () => {
        setConfigured();
        const { uploadProductImage } = await import('../../app/lib/s3');
        await expect(uploadProductImage(makeFile(100, 'image/gif'))).rejects.toThrow(/Formato no admitido/);
    });

    it('uploads and returns the public URL built from S3_PUBLIC_URL + bucket + key', async () => {
        setConfigured();
        mockSend.mockResolvedValue({});
        const { uploadProductImage } = await import('../../app/lib/s3');
        const url = await uploadProductImage(makeFile(100, 'image/png'));
        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(url).toMatch(/^https:\/\/storage\.example\.com\/oneiros\/products\/[0-9a-f-]+\.png$/);
    });

    it('strips a trailing slash from S3_PUBLIC_URL before building the URL', async () => {
        setConfigured();
        process.env.S3_PUBLIC_URL = 'https://storage.example.com';
        mockSend.mockResolvedValue({});
        const { uploadProductImage } = await import('../../app/lib/s3');
        const url = await uploadProductImage(makeFile(100, 'image/webp'));
        expect(url.startsWith('https://storage.example.com/oneiros/products/')).toBe(true);
    });
});
