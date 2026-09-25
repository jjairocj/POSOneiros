import { Metadata } from 'next';
import { startOfMonth } from 'date-fns';
import { getProductRankingReport, getShiftsReport } from '@/app/actions/report';
import { businessDayKey } from '@/app/lib/time';
import { BarChart3, TrendingUp, MonitorPlay } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductRankingTab } from './components/ProductRankingTab';
import { ShiftsReportTab } from './components/ShiftsReportTab';
import { ReportsExportButton } from './components/ReportsExportButton';
import { SalesFilters } from '../sales/components/SalesFilters';

export const metadata: Metadata = {
    title: "Oneiros Admin | Reportes",
};

interface ReportsPageProps {
    searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
    const params = await searchParams;
    // Default: current calendar month.
    const endDate = params.to ? new Date(`${params.to}T23:59:59`) : new Date();
    const startDate = params.from ? new Date(`${params.from}T00:00:00`) : startOfMonth(new Date());

    const [ranking, shifts] = await Promise.all([
        getProductRankingReport({ startDate, endDate }),
        getShiftsReport({ startDate, endDate }),
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
                        <p className="text-muted-foreground mt-1 text-sm md:text-lg">Rentabilidad de productos y turnos, por rango de fechas.</p>
                    </div>
                </div>
                <ReportsExportButton from={businessDayKey(startDate)} to={businessDayKey(endDate)} />
            </header>

            <SalesFilters from={businessDayKey(startDate)} to={businessDayKey(endDate)} basePath="/admin/reports" />

            <Tabs defaultValue="ranking" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="ranking" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Rentabilidad de Productos
                    </TabsTrigger>
                    <TabsTrigger value="shifts" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <MonitorPlay className="w-4 h-4" /> Turnos
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

                <TabsContent value="shifts" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    {shifts.success ? (
                        <ShiftsReportTab rows={shifts.rows} />
                    ) : (
                        <div className="text-destructive font-bold p-6 bg-destructive/10 rounded-2xl border border-destructive/20">
                            Error cargando el reporte: {shifts.error}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
