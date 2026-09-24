"use server";
import { requirePermission } from "@/lib/auth";
import { fail, ok, toUserMessage, type ActionResult } from "@/lib/result";
import { uploadProductImage } from "@/app/lib/s3";

/** Uploads a product image to S3-compatible storage (MinIO) and returns its
 * public URL — the caller (product-form.tsx) puts that URL straight into the
 * existing `imageUrl` field, same as if the admin had pasted one by hand. */
export async function uploadProductImageAction(formData: FormData): Promise<ActionResult<{ url: string }>> {
    try {
        await requirePermission("MANAGE_CATALOG");
        const file = formData.get("file");
        if (!(file instanceof File) || file.size === 0) return fail("Selecciona una imagen.");
        const url = await uploadProductImage(file);
        return ok({ url });
    } catch (error: unknown) {
        console.error("Error uploading product image:", error);
        return fail(toUserMessage(error, "No se pudo subir la imagen."));
    }
}
