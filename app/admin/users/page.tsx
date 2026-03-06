import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Oneiros Admin | Usuarios",
};

export default function UsersPage() {
    return (
        <div className="space-y-6">
            <header className="mb-10">
                <h1 className="text-4xl font-black text-foreground tracking-tight">Usuarios y Cajas</h1>
                <p className="text-muted-foreground mt-2 text-lg">Gestión de personal, roles (Cajero/Admin) y terminales físicas.</p>
            </header>

            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm p-4">
                <p className="text-center text-muted-foreground py-12">Gestión de usuarios en construcción...</p>
            </div>
        </div>
    );
}
