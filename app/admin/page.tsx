export const metadata = {
    title: "Oneiros Admin | Resumen",
};

export default function AdminDashboardPage() {
    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-4xl font-black text-foreground tracking-tight">Resumen Ejecutivo</h1>
                <p className="text-muted-foreground mt-2 text-lg">Visión general del estado financiero y operativo del negocio.</p>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {/* Placeholder Widgets */}
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="font-bold text-muted-foreground mb-4">Ventas de Hoy</h3>
                    <p className="text-3xl font-black">$---</p>
                </div>
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="font-bold text-muted-foreground mb-4">Transacciones</h3>
                    <p className="text-3xl font-black">---</p>
                </div>
                <div className="bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <h3 className="font-bold text-muted-foreground mb-4">Productos en Bajo Stock</h3>
                    <p className="text-3xl font-black text-destructive">---</p>
                </div>
            </div>
        </div>
    );
}
