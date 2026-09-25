"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import ProductCard from "./ProductCard";
import CategorySelector from "./CategorySelector";
import { getProducts } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";
import OrderSwitcher from "./OrderSwitcher";
import { Loader2, Search, X, CloudOff } from "lucide-react";
import type { CatalogProduct, CatalogCategory } from "@/app/types/cart";
import { saveCatalogSnapshot, loadCatalogSnapshot, filterCatalogLocally } from "@/app/lib/offlineCatalog";
import { useCartStore } from "@/app/store/useCartStore";

const FULL_CATALOG_RESYNC_MS = 5 * 60 * 1000;

/** Tries the server first; on failure, falls back to the last IndexedDB snapshot
 * filtered client-side. `usedFallback` distinguishes "served from cache" (still
 * shows the offline banner) from a genuine server hit. */
async function resolveCatalog(categoryId: string, search?: string): Promise<{ products: CatalogProduct[] | null; usedFallback: boolean }> {
    const remote = search?.trim()
        ? await Promise.resolve(getProducts(undefined, search.trim())).catch(() => null)
        : await Promise.resolve(getProducts(categoryId)).catch(() => null);
    if (remote != null) return { products: remote, usedFallback: false };

    const snapshot = await loadCatalogSnapshot();
    if (!snapshot) return { products: null, usedFallback: false };
    return { products: filterCatalogLocally(snapshot, categoryId, search), usedFallback: true };
}

export default function ProductGrid() {
    const [products, setProducts] = useState<CatalogProduct[]>([]);
    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState('favorites');
    const [isPending, startTransition] = useTransition();
    const [initialized, setInitialized] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    // True when the last attempt to reach the server for the catalog threw
    // (a dropped connection, not a normal "no results"). While true, we keep
    // showing whatever was already on screen instead of blanking it — the
    // cashier can still sell from what's visible, just can't switch
    // category/search until the connection is back.
    const [offline, setOffline] = useState(false);
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Autocomplete dropdown under the search box: lets a cashier type a
    // product name and add it with Enter/click, no scrolling through the
    // grid needed — separate from the grid re-filtering below, which still
    // happens for browsing.
    const [searchFocused, setSearchFocused] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const searchBoxRef = useRef<HTMLDivElement>(null);
    const addItem = useCartStore((state) => state.addItem);

    useEffect(() => {
        async function init() {
            try {
                const { products: p, usedFallback } = await resolveCatalog('favorites');
                const c = await getCategories().catch(() => null);
                if (c) {
                    setCategories(c);
                } else {
                    const snapshot = await loadCatalogSnapshot();
                    if (snapshot) setCategories(snapshot.categories);
                }
                setOffline(usedFallback || p === null);
                if (p && p.length > 0) {
                    setProducts(p);
                } else if (p !== null) {
                    // Genuinely no favorites yet (server or cache): don't open on an empty screen.
                    setActiveCategoryId('all');
                    const all = await resolveCatalog('all');
                    setOffline(all.usedFallback || all.products === null);
                    if (all.products !== null) setProducts(all.products);
                }
            } catch (error) {
                console.error("Error initializing catalog:", error);
            } finally {
                setInitialized(true);
            }
        }
        init();
    }, []);

    // Keeps a full-catalog IndexedDB snapshot fresh for offline fallback —
    // independent of whatever filtered view is on screen. Starts only after
    // the initial (visible) catalog load finishes, so it never competes with
    // it for the same network round-trip; then repeats on an interval while
    // mounted. Deliberately doesn't also listen for "online" — the visible
    // retry effect below already re-fetches the current view on reconnect,
    // and doubling up here would just be a second redundant request racing it.
    useEffect(() => {
        if (!initialized) return;
        let cancelled = false;
        async function syncFullCatalog() {
            const [all, cats] = await Promise.all([
                Promise.resolve(getProducts('all')).catch(() => null),
                Promise.resolve(getCategories()).catch(() => null),
            ]);
            if (!cancelled && all && cats) saveCatalogSnapshot(all, cats);
        }
        syncFullCatalog();
        const interval = setInterval(syncFullCatalog, FULL_CATALOG_RESYNC_MS);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [initialized]);

    // Silently re-fetch the current view when the browser regains
    // connectivity, so the "sin conexión" banner clears and category/search
    // start working again without the cashier having to do anything.
    useEffect(() => {
        const retry = () => {
            if (!offline) return;
            startTransition(async () => {
                const { products: results, usedFallback } = searchQuery.trim()
                    ? await resolveCatalog(activeCategoryId, searchQuery.trim())
                    : await resolveCatalog(activeCategoryId);
                setOffline(usedFallback || results === null);
                if (results !== null) setProducts(results);
            });
        };
        window.addEventListener("online", retry);
        return () => window.removeEventListener("online", retry);
    }, [offline, activeCategoryId, searchQuery]);

    // Closes the suggestions dropdown on an outside click.
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setSearchFocused(false);
        }
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const suggestions = searchQuery.trim() ? products.slice(0, 6) : [];

    const addFromSuggestion = (product: CatalogProduct) => {
        if (product.stock <= 0) return;
        addItem(product);
        setSearchQuery("");
        setHighlightIndex(0);
        startTransition(async () => {
            const { products: results, usedFallback } = await resolveCatalog(activeCategoryId);
            setOffline(usedFallback || results === null);
            if (results !== null) setProducts(results);
        });
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (suggestions.length === 0) return;
        if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setHighlightIndex((i) => Math.max(i - 1, 0)); }
        else if (e.key === "Enter") { e.preventDefault(); addFromSuggestion(suggestions[highlightIndex]); }
        else if (e.key === "Escape") { setSearchFocused(false); }
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setHighlightIndex(0);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            startTransition(async () => {
                // Search across ALL products ignoring active category, or
                // restore the current category view when the box is cleared.
                const { products: results, usedFallback } = value.trim()
                    ? await resolveCatalog(activeCategoryId, value.trim())
                    : await resolveCatalog(activeCategoryId);
                setOffline(usedFallback || results === null);
                if (results !== null) setProducts(results);
            });
        }, 300);
    };

    const handleCategorySelect = (id: string) => {
        setActiveCategoryId(id);
        setSearchQuery("");
        startTransition(async () => {
            const { products: filtered, usedFallback } = await resolveCatalog(id);
            setOffline(usedFallback || filtered === null);
            if (filtered !== null) setProducts(filtered);
        });
    };

    const handleClear = () => {
        setSearchQuery("");
        startTransition(async () => {
            const { products: results, usedFallback } = await resolveCatalog(activeCategoryId);
            setOffline(usedFallback || results === null);
            if (results !== null) setProducts(results);
        });
    };

    if (!initialized) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground opacity-70 min-h-[50vh]">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <span className="text-lg font-medium">Cargando catálogo...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full rounded-tr-3xl">
            <div className="pb-1">
            <OrderSwitcher />

            {/* Search bar */}
            <div ref={searchBoxRef} className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    role="combobox"
                    aria-expanded={searchFocused && suggestions.length > 0}
                    placeholder="Buscar en todo el catálogo..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full h-10 pl-9 pr-9 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
                {searchQuery && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {/* Autocomplete dropdown — type + Enter (or tap) adds the product
                    straight to the cart, no scrolling through the grid needed. */}
                {searchFocused && suggestions.length > 0 && (
                    <div className="absolute z-30 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl py-1.5 animate-in fade-in zoom-in-95 duration-150">
                        {suggestions.map((p, i) => (
                            <button
                                key={p.id}
                                type="button"
                                disabled={p.stock <= 0}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => addFromSuggestion(p)}
                                onMouseEnter={() => setHighlightIndex(i)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${i === highlightIndex ? "bg-primary/10" : "hover:bg-muted"}`}
                            >
                                <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                                    {p.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element -- small catalog thumbnail
                                        <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-sm opacity-30">📦</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {p.stock <= 0 ? "Agotado" : `${p.stock} en stock`}
                                    </p>
                                </div>
                                <span className="text-sm font-bold text-primary shrink-0">${p.price.toLocaleString()}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <CategorySelector
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelect={handleCategorySelect}
            />

            {offline && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <CloudOff className="w-4 h-4 shrink-0" />
                    Sin conexión — mostrando el catálogo guardado localmente. El stock y los precios pueden no estar actualizados; se confirman al procesar la venta.
                </div>
            )}
            </div>{/* end sticky header */}

            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 pb-28 lg:pb-4 transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <span className="text-4xl mb-4">🔍</span>
                        <p className="text-lg font-medium">
                            {searchQuery
                                ? `Sin resultados para "${searchQuery}"`
                                : activeCategoryId === 'favorites'
                                    ? "Aún no hay favoritos. Toca la ⭐ de un producto para tenerlo aquí."
                                    : "No hay productos en esta categoría."}
                        </p>
                    </div>
                )}
            </div>
            </div>{/* end scroll wrapper */}
        </div>
    );
}
