"use client";
import styles from "./catalog.module.css";
import { useCartStore } from "@/app/store/useCartStore";

export default function OrderSwitcher() {
    const { orders, activeOrderId, setActiveOrder, addOrder, removeOrder } = useCartStore();

    const handleAddOrder = () => {
        const name = prompt("Nombre del nuevo pedido (ej: Mesa 5, Cliente Juan):");
        if (name) {
            addOrder(name);
        }
    };

    return (
        <div className={styles.orderSwitcher}>
            <div className={styles.orderList}>
                {Object.values(orders).map((order) => (
                    <div 
                        key={order.id} 
                        className={`${styles.orderTab} ${activeOrderId === order.id ? styles.activeTab : ""}`}
                        onClick={() => setActiveOrder(order.id)}
                    >
                        <span className={styles.orderName}>{order.name}</span>
                        {Object.keys(orders).length > 1 && (
                            <button 
                                className={styles.removeOrderBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`¿Cerrar la orden "${order.name}"?`)) {
                                        removeOrder(order.id);
                                    }
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <button className={styles.addOrderBtn} onClick={handleAddOrder}>
                + Nueva
            </button>
        </div>
    );
}
