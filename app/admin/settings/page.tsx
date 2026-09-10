import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSettings } from "@/app/actions/settings";
import { SettingsForm } from "./components/SettingsForm";
import { SlidersHorizontal } from "lucide-react";

export const metadata: Metadata = {
  title: "Oneiros Admin | Ajustes del Sistema",
};


/**
 * ADMIN only, even though the /admin section otherwise allows SUPERVISOR
 * in: staff accounts, cash registers and business settings can lock people
 * out or misconfigure the whole store if touched by the wrong role. The
 * proxy and admin/layout.tsx already got the manager tier in past this
 * point; this is the authoritative, always-fresh check for this one page.
 */
export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") redirect("/admin");

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
