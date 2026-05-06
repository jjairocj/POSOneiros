import { Metadata } from 'next';
import { getSalesAnalytics, getSalesHistoryList } from '@/app/actions/report';
import { subDays } from 'date-fns';
import { Receipt, AreaChart as ChartIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardTab } from './components/DashboardTab';
import { HistoryTab } from './components/HistoryTab';
import { ExportButton } from './components/ExportButton';

export const metadata: Metadata = {
    title: "Oneiros Admin | Ventas y Reportes",
};

export default async function SalesPage() {
    // Default filter: Last 30 days
    const endDate = new Date();
    const startDate = subDays(endDate, 30);

    // Fetch data concurrently
    const [analytics, history] = await Promise.all([
        getSalesAnalytics({ startDate, endDate }),
        getSalesHistoryList({ startDate, endDate })
    ]);

    return (
        <div className="space-y-6 pb-20 md:pb-0">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <ChartIcon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">Ventas e Ingresos</h1>
                        <p className="text-muted-foreground mt-1 text-sm md:text-lg">Analíticas y registro histórico de transacciones.</p>
                    </div>
                </div>
                <ExportButton data={history} />
            </header>

            {/* Content Tabs */}
            <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl w-full justify-start overflow-x-auto flex-nowrap hide-scrollbar">
                    <TabsTrigger value="dashboard" className="rounded-xl px-4 md:px-6 font-bold flex items-center gap-2 flex-shrink-0">
                        <ChartIcon className="w-4 h-4" /> Resumen Analítico
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl px-4 md:px-6 font-bold flex items-center gap-2 flex-shrink-0">
                        <Receipt className="w-4 h-4" /> Histórico de Tickets
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Dashboard / Analytics */}
                <TabsContent value="dashboard" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    {analytics.success ? (
                        <DashboardTab data={analytics as any} />
                    ) : (
                        <div className="text-destructive font-bold p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
                            Error cargando analíticas: {analytics.error}
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Tickets History List */}
                <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    <HistoryTab data={history} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
