"use client";
import styles from "./cart.module.css";
import { useCartStore } from "@/app/store/useCartStore";

export default function CartDrawer() {
    const { orders, activeOrderId, updateQuantity, clearActiveOrder } = useCartStore();
    const activeOrder = orders[activeOrderId];

    if (!activeOrder) return null;

    const { items, subtotal, tax, total } = activeOrder;

    return (
        <div className={styles.cartContainer}>
            <div className={styles.header}>
                <h2>{activeOrder.name} ({items.length})</h2>
                {items.length > 0 && (
                    <button className={styles.clearBtn} onClick={clearActiveOrder}>
                         🗑️ Limpiar
                    </button>
                )}
            </div>

            <div className={styles.itemList}>
                {items.length === 0 ? (
                    <div className={styles.emptyCart}>
                        <div className={styles.emptyIcon}>🛒</div>
                        <p>Tu carrito está vacío</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className={styles.item}>
                            <div className={styles.itemInfo}>
                                <span className={styles.itemName}>{item.name}</span>
                                <span className={styles.itemPrice}>${item.price.toLocaleString()}</span>
                            </div>
                            <div className={styles.quantityControls}>
                                <button 
                                    className={styles.qtyBtn} 
                                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                    -
                                </button>
                                <span className={styles.qtyValue}>{item.quantity}</span>
                                <button 
                                    className={styles.qtyBtn} 
                                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className={styles.footer}>
                <div className={styles.summaryRow}>
                    <span>Subtotal</span>
                    <span>${subtotal.toLocaleString()}</span>
                </div>
                <div className={styles.summaryRow}>
                    <span>IVA (19%)</span>
                    <span>${tax.toLocaleString()}</span>
                </div>
                <div className={styles.totalRow}>
                    <span>TOTAL</span>
                    <span>${total.toLocaleString()}</span>
                </div>
                
                <button className={styles.checkoutBtn} disabled={items.length === 0}>
                    PROCEDER AL PAGO
                </button>
            </div>
        </div>
    );
}
