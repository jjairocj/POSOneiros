import { Metadata } from 'next';
import { subDays } from 'date-fns';
import { getProductRankingReport, getPromotionUsageReport } from '@/app/actions/report';
import { businessDayKey } from '@/app/lib/time';
import { BarChart3, TrendingUp, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductRankingTab } from './components/ProductRankingTab';
import { PromotionUsageTab } from './components/PromotionUsageTab';
import { ReportsExportButton } from './components/ReportsExportButton';

export const metadata: Metadata = {
    title: "Oneiros Admin | Reportes",
};

export default async function ReportsPage() {
    // Same default window as Ventas e Ingresos — last 30 days.
    const endDate = new Date();
    const startDate = subDays(endDate, 30);

    const [ranking, promotions] = await Promise.all([
        getProductRankingReport({ startDate, endDate }),
        getPromotionUsageReport({ startDate, endDate }),
    ]);

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <BarChart3 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Reportes</h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-lg">Rentabilidad por producto y uso de promociones — últimos 30 días.</p>
                    </div>
                </div>
                <ReportsExportButton from={businessDayKey(startDate)} to={businessDayKey(endDate)} />
            </header>

            <Tabs defaultValue="ranking" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="ranking" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Rentabilidad de Productos
                    </TabsTrigger>
                    <TabsTrigger value="promotions" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Promociones Aplicadas
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ranking" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    {ranking.success && ranking.rows ? (
                        <ProductRankingTab rows={ranking.rows} />
                    ) : (
                        <div className="text-destructive font-bold p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
                            Error cargando el reporte: {ranking.error}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="promotions" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    {promotions.success && promotions.rows ? (
                        <PromotionUsageTab rows={promotions.rows} />
                    ) : (
                        <div className="text-destructive font-bold p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
                            Error cargando el reporte: {promotions.error}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
