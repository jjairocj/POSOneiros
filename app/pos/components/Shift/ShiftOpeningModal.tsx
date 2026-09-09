"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { openShift, getRegistersForShift } from "../../../actions/shift";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, X, Loader2 } from "lucide-react";

type RegisterOption = { id: string; name: string; prefix: string | null; busyBy: string | null };

export default function ShiftOpeningModal({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [baseAmount, setBaseAmount] = useState("");
  const [registers, setRegisters] = useState<RegisterOption[] | null>(null);
  const [registerId, setRegisterId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getRegistersForShift()
      .then((list) => {
        if (cancelled) return;
        setRegisters(list);
        const free = list.filter((r) => !r.busyBy);
        if (free.length === 1) setRegisterId(free[0].id);
        else if (list.length === 1) setRegisterId(list[0].id);
      })
      .catch(() => { if (!cancelled) { setRegisters([]); setError("No se pudieron cargar las cajas."); } });
    return () => { cancelled = true; };
  }, []);

  const handleOpenShift = async () => {
    const amount = Number(baseAmount);
    if (!Number.isFinite(amount) || amount < 0) { setError("La base debe ser un número mayor o igual a cero."); return; }
    if (!registerId) { setError("Selecciona una caja."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await openShift(amount, registerId);
      if (!res.ok) { setError(res.error); return; }
      router.refresh();
      onClose?.();
    } catch {
      setError("No se pudo conectar con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
      <div className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-300 border border-border relative">
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors bg-muted/50 hover:bg-muted p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex flex-col items-center text-center space-y-2 mb-8 mt-2">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <LogIn className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Apertura de Turno</h2>
            <p className="text-muted-foreground text-sm">
                Elige la caja e ingresa el efectivo con el que empiezas.
            </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground ml-1">Caja</label>
            {registers === null ? (
              <div className="h-12 flex items-center justify-center text-muted-foreground text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando cajas…</div>
            ) : registers.length === 0 ? (
              <p className="text-sm text-destructive">No hay cajas configuradas. Pide al administrador que cree una en Usuarios y Cajas.</p>
            ) : (
              <div className="grid gap-2">
                {registers.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={!!r.busyBy}
                    onClick={() => setRegisterId(r.id)}
                    className={[
                      "w-full text-left px-4 py-3 rounded-2xl border text-sm font-semibold transition-all",
                      registerId === r.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/40 text-foreground hover:border-primary/50",
                      r.busyBy ? "opacity-50 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    {r.name}
                    {r.busyBy && <span className="block text-xs font-normal text-muted-foreground">En uso por {r.busyBy}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="baseAmount" className="text-sm font-semibold text-foreground ml-1">Base en efectivo</label>
            <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                <Input
                    id="baseAmount"
                    type="number"
                    min="0"
                    step="1000"
                    inputMode="numeric"
                    value={baseAmount}
                    onChange={(e) => setBaseAmount(e.target.value)}
                    placeholder="Ej. 100000"
                    className="pl-8 h-12 text-lg rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
                />
            </div>
          </div>

          {error && (
            <div className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">
              {error}
            </div>
          )}

          <Button
            onClick={handleOpenShift}
            disabled={loading || baseAmount === "" || !registerId}
            className="w-full h-12 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all"
          >
            {loading ? "Abriendo Turno..." : "Abrir Turno"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
