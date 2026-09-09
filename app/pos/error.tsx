"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function POSError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error("[POSError]", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center text-center gap-6 px-6 bg-background">
            <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center">
                <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-2 max-w-md">
                <h1 className="text-2xl font-black text-foreground">La caja tuvo un problema</h1>
                <p className="text-muted-foreground">
                    No se perdió nada: las ventas ya registradas están guardadas y el carrito se conserva en este dispositivo.
                    Toca reintentar; si vuelve a fallar, recarga la página o avisa al administrador.
                </p>
                {error.digest && <p className="text-xs font-mono text-muted-foreground/60">ref: {error.digest}</p>}
            </div>
            <Button onClick={reset} className="rounded-xl gap-2 h-12 px-6 text-base">
                <RefreshCw className="w-4 h-4" /> Reintentar
            </Button>
        </div>
    );
}
