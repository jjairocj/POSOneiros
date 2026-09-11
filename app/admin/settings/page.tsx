import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSettings } from "@/app/actions/settings";
import { getRolePermissions } from "@/app/actions/roles";
import { getPromotions } from "@/app/actions/promotions";
import { SettingsForm } from "./components/SettingsForm";
import { RolePermissionsForm } from "./components/RolePermissionsForm";
import { PromotionsTab } from "./components/PromotionsTab";
import { SlidersHorizontal, Settings2, ShieldCheck, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const rolePermissions = await getRolePermissions();
  const promotions = await getPromotions();

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
            Configura tu negocio, impuestos, recibos, promociones y permisos.
          </p>
        </div>
      </header>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-2xl">
          <TabsTrigger value="general" className="rounded-xl px-6 font-bold flex items-center gap-2">
            <Settings2 className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="promotions" className="rounded-xl px-6 font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Promociones
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-xl px-6 font-bold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Roles y Permisos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
          <SettingsForm initialData={settings} />
        </TabsContent>

        <TabsContent value="promotions" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
          <PromotionsTab promotions={promotions} />
        </TabsContent>

        <TabsContent value="roles" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
          <RolePermissionsForm initial={rolePermissions} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
