"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[AdminError]", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 px-4">
            <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2 max-w-md">
                <h1 className="text-2xl font-black text-foreground">Algo salió mal</h1>
                <p className="text-muted-foreground">
                    Ocurrió un error al cargar esta sección. Puedes intentar recargar o volver al inicio.
                </p>
                {error.digest && (
                    <p className="text-xs font-mono text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-lg inline-block">
                        ref: {error.digest}
                    </p>
                )}
            </div>
            <div className="flex gap-3">
                <Button variant="outline" className="rounded-xl gap-2" asChild>
                    <Link href="/admin">
                        <ArrowLeft className="w-4 h-4" /> Ir al inicio
                    </Link>
                </Button>
                <Button onClick={reset} className="rounded-xl gap-2">
                    <RefreshCw className="w-4 h-4" /> Reintentar
                </Button>
            </div>
        </div>
    );
}
