import { Metadata } from "next";
import { getSettings } from "@/app/actions/settings";
import { SettingsForm } from "./components/SettingsForm";
import { SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Oneiros Admin | Ajustes del Sistema",
};

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4 mb-10">
        <div className="p-3 bg-primary/10 rounded-2xl">
          <SlidersHorizontal className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">
            Ajustes del Sistema
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Configura tu negocio, impuestos y recibos.
          </p>
        </div>
      </header>

      <SettingsForm initialData={settings} />
    </div>
  );
}
