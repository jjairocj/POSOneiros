import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Oneiros Admin | Ajustes",
};

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-foreground tracking-tight">Ajustes del Sistema</h1>
                <p className="text-muted-foreground mt-2 text-lg">Configuraciones generales operativas (Stock negativo, Impuestos base).</p>
            </header>

            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm p-4">
                <p className="text-center text-muted-foreground py-12">Panel de ajustes en construcción...</p>
            </div>
        </div>
    );
}
