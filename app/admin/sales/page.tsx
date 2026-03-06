import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Oneiros Admin | Ventas",
};

export default function SalesPage() {
    return (
        <div className="space-y-6">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-foreground tracking-tight">Histórico de Ventas</h1>
                <p className="text-muted-foreground mt-2 text-lg">Consulta las transacciones pasadas y reimprime comprobantes.</p>
            </header>

            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm p-4">
                <p className="text-center text-muted-foreground py-12">Tabla de ventas en construcción...</p>
            </div>
        </div>
    );
}
