"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSession, requireAdmin } from "@/lib/auth";
import { toUserMessage } from "@/lib/result";

export type SettingsData = {
  // Sección 1 — Información del negocio
  businessName: string;
  businessNit: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  // Sección 2 — Configuración operacional
  allowNegativeStock: string; // "true" | "false"
  defaultTaxIva: string; // numeric string e.g. "19"
  currency: string; // "COP" | "USD" | "EUR"
  cityCountry: string;
  // Sección 3 — Recibo/Ticket
  receiptFooter: string;
  showLogoOnReceipt: string; // "true" | "false"
  businessLogoUrl: string; // image URL shown on the receipt header when showLogoOnReceipt is on
  showTaxBreakdown: string; // "true" | "false"
  receiptWidthMm: string; // numeric string e.g. "48" — printable width; many 58mm-roll printers only print ~44-48mm
};

const DEFAULT_SETTINGS: SettingsData = {
  businessName: "",
  businessNit: "",
  businessAddress: "",
  businessPhone: "",
  businessEmail: "",
  allowNegativeStock: "false",
  defaultTaxIva: "19",
  currency: "COP",
  cityCountry: "",
  receiptFooter: "¡Gracias por su compra!",
  showLogoOnReceipt: "true",
  businessLogoUrl: "",
  showTaxBreakdown: "true",
  receiptWidthMm: "48",
};

export async function getSettings(): Promise<SettingsData> {
  try {
    const configs = await prisma.systemConfig.findMany();
    const map: Record<string, string> = {};
    for (const c of configs) {
      map[c.key] = c.value;
    }
    return {
      businessName: map["businessName"] ?? DEFAULT_SETTINGS.businessName,
      businessNit: map["businessNit"] ?? DEFAULT_SETTINGS.businessNit,
      businessAddress: map["businessAddress"] ?? DEFAULT_SETTINGS.businessAddress,
      businessPhone: map["businessPhone"] ?? DEFAULT_SETTINGS.businessPhone,
      businessEmail: map["businessEmail"] ?? DEFAULT_SETTINGS.businessEmail,
      allowNegativeStock: map["allowNegativeStock"] ?? DEFAULT_SETTINGS.allowNegativeStock,
      defaultTaxIva: map["defaultTaxIva"] ?? DEFAULT_SETTINGS.defaultTaxIva,
      currency: map["currency"] ?? DEFAULT_SETTINGS.currency,
      cityCountry: map["cityCountry"] ?? DEFAULT_SETTINGS.cityCountry,
      receiptFooter: map["receiptFooter"] ?? DEFAULT_SETTINGS.receiptFooter,
      showLogoOnReceipt: map["showLogoOnReceipt"] ?? DEFAULT_SETTINGS.showLogoOnReceipt,
      businessLogoUrl: map["businessLogoUrl"] ?? DEFAULT_SETTINGS.businessLogoUrl,
      showTaxBreakdown: map["showTaxBreakdown"] ?? DEFAULT_SETTINGS.showTaxBreakdown,
      receiptWidthMm: map["receiptWidthMm"] ?? DEFAULT_SETTINGS.receiptWidthMm,
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

const ALLOWED_KEYS = new Set(Object.keys(DEFAULT_SETTINGS));

export async function saveSettings(data: SettingsData): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    const entries = (Object.entries(data) as [string, string][])
      .filter(([key]) => ALLOWED_KEYS.has(key))
      .map(([key, value]) => [key, String(value ?? "")] as [string, string]);
    const iva = Number(data.defaultTaxIva);
    if (!Number.isFinite(iva) || iva < 0 || iva > 100) return { success: false, error: "El IVA por defecto debe estar entre 0 y 100." };
    const width = Number(data.receiptWidthMm);
    if (!Number.isFinite(width) || width < 30 || width > 120) return { success: false, error: "El ancho del recibo debe estar entre 30 y 120 mm." };
    const logoUrl = data.businessLogoUrl?.trim();
    if (logoUrl && !/^https:\/\//.test(logoUrl)) {
      return { success: false, error: "La URL del logo debe empezar con https://." };
    }
    await Promise.all(
      entries.map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
    revalidatePath("/admin/settings");
    revalidatePath("/pos");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error saving settings:", error);
    return { success: false, error: toUserMessage(error) };
  }
}
