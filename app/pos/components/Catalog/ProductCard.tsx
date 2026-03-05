"use client";
import styles from "./catalog.module.css";
import { useCartStore } from "@/app/store/useCartStore";

interface ProductCardProps {
    product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
    const addItem = useCartStore((state) => state.addItem);

    return (
        <div className={styles.card} onClick={() => addItem(product)}>
            <div className={styles.image}>
                {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    "🛒"
                )}
            </div>
            <div className={styles.info}>
                <span className={styles.name}>{product.name}</span>
                <span className={styles.price}>${product.price.toLocaleString()}</span>
            </div>
        </div>
    );
}
