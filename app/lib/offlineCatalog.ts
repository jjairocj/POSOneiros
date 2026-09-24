"use client";

import type { CatalogProduct, CatalogCategory } from "@/app/types/cart";

const DB_NAME = "oneiros-pos-offline";
const DB_VERSION = 1;
const STORE = "catalog";
const SNAPSHOT_KEY = "snapshot";

export interface CatalogSnapshot {
    products: CatalogProduct[];
    categories: CatalogCategory[];
    syncedAt: number;
}

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE)) {
                req.result.createObjectStore(STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/**
 * Persists a full catalog snapshot for offline fallback. Only called after a
 * successful network fetch — this is a read cache, never the source of truth
 * for stock/price at sale time (that stays server-side in processSale).
 */
export async function saveCatalogSnapshot(products: CatalogProduct[], categories: CatalogCategory[]): Promise<void> {
    if (typeof indexedDB === "undefined") return;
    try {
        const db = await openDb();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE, "readwrite");
            tx.objectStore(STORE).put({ products, categories, syncedAt: Date.now() } satisfies CatalogSnapshot, SNAPSHOT_KEY);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch (error) {
        console.error("No se pudo guardar el catálogo local:", error);
    }
}

export async function loadCatalogSnapshot(): Promise<CatalogSnapshot | null> {
    if (typeof indexedDB === "undefined") return null;
    try {
        const db = await openDb();
        const snapshot = await new Promise<CatalogSnapshot | null>((resolve, reject) => {
            const tx = db.transaction(STORE, "readonly");
            const req = tx.objectStore(STORE).get(SNAPSHOT_KEY);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
        db.close();
        return snapshot;
    } catch (error) {
        console.error("No se pudo leer el catálogo local:", error);
        return null;
    }
}

/** Mirrors the category/search filtering getProducts() does server-side, for offline use. */
export function filterCatalogLocally(snapshot: CatalogSnapshot, categoryId: string, search?: string): CatalogProduct[] {
    const list = snapshot.products;
    const q = search?.trim().toLowerCase();
    if (q) {
        return list.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
    }
    if (categoryId === "favorites") return list.filter((p) => p.isFavorite);
    if (categoryId === "all") return list;
    if (categoryId === "uncategorized") return list.filter((p) => !p.categoryId);
    return list.filter((p) => p.categoryId === categoryId);
}
