import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import ImportWizard from "./components/ImportWizard";

export const metadata: Metadata = {
    title: "Oneiros Admin | Importar desde Siigo",
};

export default function ImportPage() {
    return (
        <div className="space-y-6">
            <header className="flex items-center gap-4 mb-10">
                <Link
                    href="/admin/inventory"
                    className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="p-3 bg-primary/10 rounded-2xl">
                    <FileSpreadsheet className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-black text-foreground tracking-tight">Importar desde Siigo</h1>
                    <p className="text-muted-foreground mt-1 text-lg">Carga el exportado de Siigo para sincronizar el inventario.</p>
                </div>
            </header>

            <div className="max-w-4xl">
                <ImportWizard />
            </div>
        </div>
    );
}
