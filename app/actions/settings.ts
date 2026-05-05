"use server";
import prisma from "../../lib/prisma";
import { revalidatePath } from "next/cache";

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
  showTaxBreakdown: string; // "true" | "false"
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
  showTaxBreakdown: "true",
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
      showTaxBreakdown: map["showTaxBreakdown"] ?? DEFAULT_SETTINGS.showTaxBreakdown,
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(data: SettingsData): Promise<{ success: boolean; error?: string }> {
  try {
    const entries = Object.entries(data) as [string, string][];
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
    return { success: true };
  } catch (error: any) {
    console.error("Error saving settings:", error);
    return { success: false, error: error.message };
  }
}
