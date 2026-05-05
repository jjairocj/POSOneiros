"use client";

import { useTransition, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveSettings, type SettingsData } from "@/app/actions/settings";
import { Building2, Settings2, Receipt } from "lucide-react";
import { toast } from "sonner";
import styles from "./SettingsForm.module.css";

interface SettingsFormProps {
  initialData: SettingsData;
}

export function SettingsForm({ initialData }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<SettingsData>(initialData);

  function updateField(key: keyof SettingsData, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveSettings(data);
      if (result.success) {
        toast.success("Configuración guardada correctamente.");
      } else {
        toast.error(result.error ?? "Error al guardar.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* Sección 1 — Información del negocio */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconBadge}>
            <Building2 className={styles.icon} />
          </div>
          <div>
            <h2 className={styles.cardTitle}>Información del negocio</h2>
            <p className={styles.cardDesc}>Datos que aparecen en recibos y facturas.</p>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Nombre del negocio</label>
            <Input
              value={data.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
              placeholder="Ej: Tienda El Sol"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>NIT / RUT</label>
            <Input
              value={data.businessNit}
              onChange={(e) => updateField("businessNit", e.target.value)}
              placeholder="Ej: 900123456-7"
            />
          </div>
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.label}>Dirección</label>
            <Input
              value={data.businessAddress}
              onChange={(e) => updateField("businessAddress", e.target.value)}
              placeholder="Ej: Calle 123 #45-67"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Teléfono</label>
            <Input
              value={data.businessPhone}
              onChange={(e) => updateField("businessPhone", e.target.value)}
              placeholder="Ej: +57 300 000 0000"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email de contacto</label>
            <Input
              type="email"
              value={data.businessEmail}
              onChange={(e) => updateField("businessEmail", e.target.value)}
              placeholder="Ej: contacto@negocio.com"
            />
          </div>
        </div>
      </section>

      {/* Sección 2 — Configuración operacional */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconBadge}>
            <Settings2 className={styles.icon} />
          </div>
          <div>
            <h2 className={styles.cardTitle}>Configuración operacional</h2>
            <p className={styles.cardDesc}>Comportamiento del sistema en ventas y productos.</p>
          </div>
        </div>

        <div className={styles.grid2}>
          <div className={styles.field}>
            <label className={styles.label}>Moneda</label>
            <Select value={data.currency} onValueChange={(v: string) => updateField("currency", v as SettingsData["currency"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COP">COP — Peso colombiano</SelectItem>
                <SelectItem value="USD">USD — Dólar estadounidense</SelectItem>
                <SelectItem value="EUR">EUR — Euro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>IVA por defecto (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={data.defaultTaxIva}
              onChange={(e) => updateField("defaultTaxIva", e.target.value)}
              placeholder="Ej: 19"
            />
          </div>
          <div className={`${styles.field} ${styles.colSpan2}`}>
            <label className={styles.label}>Ciudad / País</label>
            <Input
              value={data.cityCountry}
              onChange={(e) => updateField("cityCountry", e.target.value)}
              placeholder="Ej: Bogotá, Colombia"
            />
          </div>
        </div>

        <div className={styles.switchRow}>
          <div className={styles.switchInfo}>
            <span className={styles.switchLabel}>Permitir stock negativo</span>
            <span className={styles.switchDesc}>
              Si está desactivado, no se podrá vender un producto con stock 0.
            </span>
          </div>
          <Switch
            checked={data.allowNegativeStock === "true"}
            onCheckedChange={(v) => updateField("allowNegativeStock", String(v))}
          />
        </div>
      </section>

      {/* Sección 3 — Recibo / Ticket */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.iconBadge}>
            <Receipt className={styles.icon} />
          </div>
          <div>
            <h2 className={styles.cardTitle}>Recibo / Ticket</h2>
            <p className={styles.cardDesc}>Personaliza la apariencia del recibo impreso.</p>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Mensaje de pie de recibo</label>
          <textarea
            className={styles.textarea}
            value={data.receiptFooter}
            onChange={(e) => updateField("receiptFooter", e.target.value)}
            placeholder="Ej: ¡Gracias por su compra!"
            rows={3}
          />
        </div>

        <div className={styles.switchRow}>
          <div className={styles.switchInfo}>
            <span className={styles.switchLabel}>Mostrar logo en recibo</span>
            <span className={styles.switchDesc}>Imprime el logo del negocio en la cabecera del ticket.</span>
          </div>
          <Switch
            checked={data.showLogoOnReceipt === "true"}
            onCheckedChange={(v) => updateField("showLogoOnReceipt", String(v))}
          />
        </div>

        <div className={styles.switchRow}>
          <div className={styles.switchInfo}>
            <span className={styles.switchLabel}>Mostrar desglose de impuestos</span>
            <span className={styles.switchDesc}>Muestra IVA, ICA e ImpoConsumo por separado en el recibo.</span>
          </div>
          <Switch
            checked={data.showTaxBreakdown === "true"}
            onCheckedChange={(v) => updateField("showTaxBreakdown", String(v))}
          />
        </div>
      </section>

      {/* Submit */}
      <div className={styles.submitBar}>
        <Button type="submit" size="lg" disabled={isPending} className={styles.submitBtn}>
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
