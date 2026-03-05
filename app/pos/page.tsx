import { getActiveShift } from "../actions/shift";
import { redirect } from "next/navigation";
import styles from "./pos.module.css";
import ShiftOpeningModal from "./components/ShiftOpeningModal";
import ShiftHeader from "./components/Shift/ShiftHeader";
import ProductGrid from "./components/Catalog/ProductGrid";
import CartDrawer from "./components/Catalog/CartDrawer";

export default async function POSPage() {
  const activeShift = await getActiveShift();

  return (
    <div className={styles.posContainer}>
      {!activeShift && <ShiftOpeningModal />}
      
      <header className={styles.header}>
        <ShiftHeader activeShift={activeShift} />
      </header>

      <main className={styles.mainContent}>
        {activeShift ? (
          <div className={styles.posGrid}>
            <section className={styles.catalogSection}>
              <ProductGrid />
            </section>
            
            <aside className={styles.cartSection}>
              <CartDrawer />
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
