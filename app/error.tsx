"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[GlobalError]", error);
    }, [error]);

    return (
        <html>
            <body className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="flex flex-col items-center text-center space-y-6 max-w-md">
                    <div className="w-20 h-20 bg-destructive/10 rounded-3xl flex items-center justify-center">
                        <AlertTriangle className="w-10 h-10 text-destructive" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-black">Error inesperado</h1>
                        <p className="text-muted-foreground text-sm">
                            La aplicación encontró un problema. Por favor recarga la página.
                        </p>
                        {error.digest && (
                            <p className="text-xs font-mono text-muted-foreground/60">ref: {error.digest}</p>
                        )}
                    </div>
                    <Button onClick={reset} className="rounded-xl gap-2">
                        <RefreshCw className="w-4 h-4" /> Recargar
                    </Button>
                </div>
            </body>
        </html>
    );
}
