"use client";
import styles from "./catalog.module.css";

interface CategorySelectorProps {
    categories: any[];
    activeCategoryId: string;
    onSelect: (id: string) => void;
}

export default function CategorySelector({ 
    categories, 
    activeCategoryId, 
    onSelect 
}: CategorySelectorProps) {
    return (
        <div className={styles.categorySelector}>
            <button 
                className={`${styles.categoryBtn} ${activeCategoryId === 'all' ? styles.activeCategory : ""}`}
                onClick={() => onSelect('all')}
            >
                🔥 Todo
            </button>
            {categories.map((cat) => (
                <button
                    key={cat.id}
                    className={`${styles.categoryBtn} ${activeCategoryId === cat.id ? styles.activeCategory : ""}`}
                    onClick={() => onSelect(cat.id)}
                >
                    {cat.name}
                </button>
            ))}
        </div>
    );
}
