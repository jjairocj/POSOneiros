import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { UserError } from "@/lib/result";

/**
 * S3-compatible storage (MinIO self-hosted on CasaOS, see
 * docker-compose.casaos-minio.yml). All five env vars are required for
 * uploads to work — see docs/14-Configuración-y-variables-de-entorno.md.
 * Deliberately not validated at module load: an app without image uploads
 * configured should keep working for everything else, and only fail when
 * someone actually tries to upload.
 */
function getConfig() {
    const endpoint = process.env.S3_ENDPOINT;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;
    const publicUrl = process.env.S3_PUBLIC_URL;
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
        return null;
    }
    return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl: publicUrl.replace(/\/$/, "") };
}

let client: S3Client | null = null;
function getClient(endpoint: string, accessKeyId: string, secretAccessKey: string) {
    if (!client) {
        client = new S3Client({
            endpoint,
            region: process.env.S3_REGION || "us-east-1",
            credentials: { accessKeyId, secretAccessKey },
            // MinIO (and most self-hosted S3-compatible servers) need path-style
            // addressing (http://host/bucket/key) — virtual-hosted style
            // (http://bucket.host/key) needs per-bucket DNS/TLS you don't have here.
            forcePathStyle: true,
        });
    }
    return client;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export function isStorageConfigured(): boolean {
    return getConfig() !== null;
}

/** Uploads a product image and returns its public URL, or throws UserError-friendly messages the caller should catch. */
export async function uploadProductImage(file: File): Promise<string> {
    const config = getConfig();
    if (!config) {
        throw new UserError("El almacenamiento de imágenes no está configurado. Pide al administrador que configure S3_* en el servidor.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        throw new UserError("La imagen no puede pesar más de 5 MB.");
    }
    const ext = ALLOWED_TYPES[file.type];
    if (!ext) {
        throw new UserError("Formato no admitido — usa JPG, PNG o WEBP.");
    }

    const key = `products/${randomUUID()}.${ext}`;
    const body = new Uint8Array(await file.arrayBuffer());
    const s3 = getClient(config.endpoint, config.accessKeyId, config.secretAccessKey);
    await s3.send(new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: file.type,
    }));

    return `${config.publicUrl}/${config.bucket}/${key}`;
}
