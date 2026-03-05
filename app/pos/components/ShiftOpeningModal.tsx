"use client";

import { useState, useEffect } from "react";
import { openShift } from "../../actions/shift";
import styles from "./shift-modal.module.css";

export default function ShiftOpeningModal() {
  const [baseAmount, setBaseAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // In a real app, we'd fetch registers for the branch. 
  // For now, we use the one created in seed.
  const registerId = "caja-1"; 

  const handleOpenShift = async () => {
    setLoading(true);
    try {
      await openShift(baseAmount, registerId);
      setIsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Error al abrir turno");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Apertura de Turno</h2>
        <p>Ingresa el monto base en caja para iniciar.</p>
        
        <div className={styles.inputGroup}>
          <label>Monto Base (Efectivo)</label>
          <input 
            type="number" 
            value={baseAmount} 
            onChange={(e) => setBaseAmount(Number(e.target.value))}
            placeholder="0.00"
            className={styles.input}
          />
        </div>

        <button 
          onClick={handleOpenShift} 
          disabled={loading}
          className={styles.submitBtn}
        >
          {loading ? "Abriendo..." : "Abrir Turno"}
        </button>
      </div>
    </div>
  );
}
