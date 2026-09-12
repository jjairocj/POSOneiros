"use client";
import { useEffect } from "react";
import { useOfflineSalesQueue, flushOfflineSalesQueue } from "@/app/lib/offlineSalesQueue";

/** Mounted once for the whole /pos section. Retries queued sales whenever
 * the browser regains connectivity, and on a slow poll in case the
 * `online` event doesn't fire (some routers/proxies flap without a clean
 * transition). Renders a banner only while something is actually pending. */
export function OfflineSalesSync() {
    const pendingCount = useOfflineSalesQueue((s) => s.pending.length);

    useEffect(() => {
        flushOfflineSalesQueue();
        window.addEventListener("online", flushOfflineSalesQueue);
        const interval = setInterval(flushOfflineSalesQueue, 20000);
        return () => {
            window.removeEventListener("online", flushOfflineSalesQueue);
            clearInterval(interval);
        };
    }, []);

    if (pendingCount === 0) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[300] bg-amber-500 text-black text-sm font-semibold text-center py-1.5 shadow-md">
            {pendingCount === 1
                ? "1 venta pendiente de conexión — se enviará sola al reconectar."
                : `${pendingCount} ventas pendientes de conexión — se enviarán solas al reconectar.`}
        </div>
    );
}
