"use client";
import { useEffect, useState, useTransition } from "react";
import ProductCard from "./ProductCard";
import CategorySelector from "./CategorySelector";
import styles from "./catalog.module.css";
import { getProducts } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";

import OrderSwitcher from "./OrderSwitcher";

export default function ProductGrid() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState('all');
    const [isPending, startTransition] = useTransition();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        async function init() {
            try {
                // Ensure we handle potential errors in server actions
                const [p, c] = await Promise.all([
                    getProducts().catch(() => []),
                    getCategories().catch(() => [])
                ]);
                setProducts(p || []);
                setCategories(c || []);
            } catch (error) {
                console.error("Error initializing catalog:", error);
            } finally {
                setInitialized(true);
            }
        }
        init();
    }, []);

    const handleCategorySelect = (id: string) => {
        setActiveCategoryId(id);
        startTransition(async () => {
            try {
                const filtered = await getProducts(id);
                setProducts(filtered || []);
            } catch (error) {
                console.error("Error filtering category:", error);
            }
        });
    };

    if (!initialized) {
        return (
            <div className={styles.loading}>
                <span>Cargando catálogo...</span>
            </div>
        );
    }

    return (
        <div className={styles.catalogContainer}>
            <OrderSwitcher />
            <CategorySelector 
                categories={categories} 
                activeCategoryId={activeCategoryId} 
                onSelect={handleCategorySelect} 
            />
            <div className={`${styles.grid} ${isPending ? styles.gridUpdating : ""}`}>
                {products && products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className={styles.loading}>No hay productos en esta categoría.</div>
                )}
            </div>
        </div>
    );
}

