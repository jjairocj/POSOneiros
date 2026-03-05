import { getActiveShift } from "../actions/shift";
import { redirect } from "next/navigation";
import styles from "./pos.module.css";
import ShiftOpeningModal from "./components/ShiftOpeningModal";

export default async function POSPage() {
  const activeShift = await getActiveShift();

  return (
    <div className={styles.posContainer}>
      {!activeShift && <ShiftOpeningModal />}
      
      <header className={styles.header}>
        <div className={styles.userInfo}>
          <h1>Venta</h1>
          {activeShift && (
            <span className={styles.shiftBadge}>
              Turno: {activeShift.register.name}
            </span>
          )}
        </div>
      </header>

      <main className={styles.mainContent}>
        {activeShift ? (
          <div className={styles.posGrid}>
            <section className={styles.catalogSection}>
              {/* Product Catalog will go here */}
              <p>Cargando catálogo...</p>
            </section>
            
            <aside className={styles.cartSection}>
              {/* Cart Section will go here */}
              <p>Carrito vacío</p>
            </aside>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <h2>No hay un turno abierto</h2>
            <p>Debes abrir un turno para comenzar a vender.</p>
          </div>
        )}
      </main>
    </div>
  );
}
