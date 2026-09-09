"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { KeyRound, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeOwnPassword } from "@/app/actions/users";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (next !== confirm) { setError("Las contraseñas nuevas no coinciden."); return; }
        setLoading(true);
        try {
            const res = await changeOwnPassword(current, next);
            if (!res.success) { setError(res.error ?? "No se pudo cambiar la contraseña."); return; }
            toast.success("Contraseña actualizada.");
            onClose();
        } catch {
            setError("No se pudo conectar con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    const field = "h-11 rounded-xl bg-muted/50";
    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <form onSubmit={submit} className="bg-card w-full max-w-sm rounded-[2rem] shadow-2xl p-7 border border-border relative animate-in zoom-in-95 duration-200 space-y-4">
                <button type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-5 right-5 text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted p-2 rounded-full transition-colors">
                    <X className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center text-center gap-2">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                        <KeyRound className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold">Cambiar contraseña</h2>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="pw-current" className="text-sm font-semibold ml-1">Contraseña actual</label>
                    <Input id="pw-current" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required className={field} />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="pw-next" className="text-sm font-semibold ml-1">Nueva contraseña</label>
                    <Input id="pw-next" type="password" autoComplete="new-password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} required className={field} />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="pw-confirm" className="text-sm font-semibold ml-1">Repite la nueva contraseña</label>
                    <Input id="pw-confirm" type="password" autoComplete="new-password" minLength={6} value={confirm} onChange={(e) => setConfirm(e.target.value)} required className={field} />
                </div>
                {error && <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-xl border border-destructive/20 text-center">{error}</p>}
                <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl font-bold">
                    {loading ? "Guardando…" : "Guardar"}
                </Button>
            </form>
        </div>,
        document.body
    );
}
