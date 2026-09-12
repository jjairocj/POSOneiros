"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import ProductCard from "./ProductCard";
import CategorySelector from "./CategorySelector";
import { getProducts } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";
import OrderSwitcher from "./OrderSwitcher";
import { Loader2, Search, X, CloudOff } from "lucide-react";
import type { CatalogProduct, CatalogCategory } from "@/app/types/cart";

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

    useEffect(() => {
        async function init() {
            try {
                const [p, c] = await Promise.all([
                    getProducts('favorites').catch(() => null),
                    getCategories().catch(() => [])
                ]);
                setCategories(c || []);
                setOffline(p === null);
                if (p && p.length > 0) {
                    setProducts(p);
                } else if (p !== null) {
                    // Reached the server, genuinely no favorites yet: don't open on an empty screen.
                    setActiveCategoryId('all');
                    const all = await getProducts('all').catch(() => null);
                    setOffline(all === null);
                    if (all !== null) setProducts(all);
                }
            } catch (error) {
                console.error("Error initializing catalog:", error);
            } finally {
                setInitialized(true);
            }
        }
        init();
    }, []);

    // Silently re-fetch the current view when the browser regains
    // connectivity, so the "sin conexión" banner clears and category/search
    // start working again without the cashier having to do anything.
    useEffect(() => {
        const retry = () => {
            if (!offline) return;
            startTransition(async () => {
                const results = searchQuery.trim()
                    ? await getProducts(undefined, searchQuery.trim()).catch(() => null)
                    : await getProducts(activeCategoryId).catch(() => null);
                setOffline(results === null);
                if (results !== null) setProducts(results);
            });
        };
        window.addEventListener("online", retry);
        return () => window.removeEventListener("online", retry);
    }, [offline, activeCategoryId, searchQuery]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            startTransition(async () => {
                // Search across ALL products ignoring active category, or
                // restore the current category view when the box is cleared.
                const results = value.trim()
                    ? await getProducts(undefined, value.trim()).catch(() => null)
                    : await getProducts(activeCategoryId).catch(() => null);
                setOffline(results === null);
                if (results !== null) setProducts(results);
            });
        }, 300);
    };

    const handleCategorySelect = (id: string) => {
        setActiveCategoryId(id);
        setSearchQuery("");
        startTransition(async () => {
            const filtered = await getProducts(id).catch(() => null);
            setOffline(filtered === null);
            if (filtered !== null) setProducts(filtered);
        });
    };

    const handleClear = () => {
        setSearchQuery("");
        startTransition(async () => {
            const results = await getProducts(activeCategoryId).catch(() => null);
            setOffline(results === null);
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
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar en todo el catálogo..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
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
            </div>

            <CategorySelector
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelect={handleCategorySelect}
            />

            {offline && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <CloudOff className="w-4 h-4 shrink-0" />
                    Sin conexión — mostrando el catálogo que ya tenías cargado. Buscar o cambiar de categoría no funcionará hasta que vuelva la conexión.
                </div>
            )}
            </div>{/* end sticky header */}

            <div className="flex-1 min-h-0 overflow-y-auto">
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-28 lg:pb-4 transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
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
