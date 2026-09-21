import { Metadata } from "next";
import { redirect } from "next/navigation";
import { subDays } from "date-fns";
import { Sparkles, Settings2, TrendingUp } from "lucide-react";
import { getEffectivePermissions, hasPermission } from "@/lib/auth";
import { getPromotions } from "@/app/actions/promotions";
import { getPromotionUsageReport } from "@/app/actions/report";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PromotionsTab } from "./components/PromotionsTab";
import { PromotionUsageTab } from "@/app/admin/reports/components/PromotionUsageTab";
import { Hint } from "@/app/components/TutorialMode";
import { businessDayKey } from "@/app/lib/time";
import { PromotionsExportButton } from "./components/PromotionsExportButton";

export const metadata: Metadata = {
    title: "Oneiros Admin | Promociones",
};

/**
 * Everything about promotions in one place: configure them, and see how much
 * each one is actually being used. Same permission the actions enforce
 * (MANAGE_CATALOG); the sidebar entry is hidden for anyone without it.
 */
export default async function PromotionsPage() {
    const permissions = await getEffectivePermissions();
    if (!hasPermission(permissions, "MANAGE_CATALOG")) redirect("/admin");

    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    const [promotions, usage] = await Promise.all([
        getPromotions(),
        getPromotionUsageReport({ startDate, endDate }),
    ]);

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <header className="flex items-center gap-4 mb-10">
                <div className="p-3 bg-primary/10 rounded-2xl">
                    <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Promociones</h1>
                    <Hint className="text-muted-foreground mt-1 text-sm md:text-lg">
                        Crea y administra las promociones y revisa cuánto se usaron en los últimos 30 días.
                    </Hint>
                </div>
            </header>

            <Tabs defaultValue="manage" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="manage" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <Settings2 className="w-4 h-4" /> Administrar
                    </TabsTrigger>
                    <TabsTrigger value="usage" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Resultados
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="manage" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    <PromotionsTab promotions={promotions} />
                </TabsContent>

                <TabsContent value="usage" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    {usage.success && usage.rows ? (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <PromotionsExportButton from={businessDayKey(startDate)} to={businessDayKey(endDate)} />
                            </div>
                            <PromotionUsageTab rows={usage.rows} />
                        </div>
                    ) : (
                        <p className="text-muted-foreground text-sm text-center py-10">
                            No tienes acceso a los reportes de uso o no se pudieron cargar.
                        </p>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
