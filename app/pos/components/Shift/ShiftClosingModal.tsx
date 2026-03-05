"use client";

import { useState } from "react";
import { closeShift } from "@/app/actions/shift";
import styles from "./shift.module.css";
import { useRouter } from "next/navigation";

// Reuse glassmorphism from shift.module.css
export default function ShiftClosingModal({ activeShiftId, onCancel }: { activeShiftId: string, onCancel: () => void }) {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [summary, setSummary] = useState<any>(null);
    const router = useRouter();

    const handleCloseShift = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        
        const closeAmount = parseFloat(amount);
        if (isNaN(closeAmount) || closeAmount < 0) {
            setError("Monto inválido");
            return;
        }

        setLoading(true);
        try {
            const res = await closeShift(activeShiftId, closeAmount);
            setSummary(res.summary);
            // Don't auto-refresh yet, let user see the Z-Report summary
        } catch (err: any) {
            setError(err.message || "Error al cerrar turno");
            setLoading(false);
        }
    };

    const handleAcknowledge = () => {
        // Force refresh to trigger ShiftGuard (which will demand a new shift)
        router.refresh();
        window.location.reload();
    };

    if (summary) {
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContainer}>
                    <div className={styles.modalHeader}>
                        <h2>Reporte de Cierre Z</h2>
                    </div>
                    <div className={styles.modalBody}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Total Ventas:</span>
                                <strong>${summary.totalSales.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Esperado en Caja:</span>
                                <strong>${summary.expected.toLocaleString()}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Declarado:</span>
                                <strong>${summary.declared.toLocaleString()}</strong>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                color: summary.difference < 0 ? '#ff4d4f' : (summary.difference > 0 ? '#52c41a' : 'inherit'),
                                marginTop: '1rem',
                                paddingTop: '1rem',
                                borderTop: '1px solid var(--glass-border)'
                            }}>
                                <span>Diferencia (Descuadre):</span>
                                <strong>${summary.difference.toLocaleString()}</strong>
                            </div>
                        </div>
                        <button 
                            className={styles.submitBtn} 
                            onClick={handleAcknowledge}
                        >
                            Confirmar y Salir
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2>Cerrar Turno Actual</h2>
                    <p>Ingresa el dinero total en caja para realizar el arqueo.</p>
                </div>
                
                <form onSubmit={handleCloseShift} className={styles.modalBody}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="closeAmount">Monto Total ($)</label>
                        <input
                            id="closeAmount"
                            type="number"
                            min="0"
                            step="100"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Ej. 150000"
                            required
                        />
                    </div>
                    
                    {error && <div className={styles.errorAlert}>{error}</div>}
                    
                    <div style={{ display: "flex", gap: "1rem" }}>
                        <button 
                            type="button" 
                            className={styles.cancelBtn}
                            onClick={onCancel}
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className={styles.submitBtn}
                            disabled={loading || !amount}
                        >
                            {loading ? "Calculando..." : "Cerrar Turno"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
