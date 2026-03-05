"use client";
import { useState } from "react";
import styles from "../../pos.module.css";
import ShiftClosingModal from "./ShiftClosingModal";

export default function ShiftHeader({ activeShift }: { activeShift: any }) {
    const [isClosingInfo, setIsClosingInfo] = useState(false);

    if (!activeShift) return (
        <div className={styles.userInfo}>
            <h1>Venta</h1>
        </div>
    );

    return (
        <div className={styles.userInfo}>
            <h1>Venta</h1>
            <span className={styles.shiftBadge}>
                Turno: {activeShift.register?.name || 'Caja Fija'}
            </span>
            <button 
                onClick={() => setIsClosingInfo(true)}
                className={styles.closeShiftBtn}
                title="Cerrar turno de caja"
            >
                Cerrar Turno
            </button>
            {isClosingInfo && (
                <ShiftClosingModal 
                    activeShiftId={activeShift.id} 
                    onCancel={() => setIsClosingInfo(false)} 
                />
            )}
        </div>
    );
}
