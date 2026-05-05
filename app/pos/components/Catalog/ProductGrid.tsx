"use client";
import { useEffect, useState, useTransition, useRef } from "react";
import ProductCard from "./ProductCard";
import CategorySelector from "./CategorySelector";
import { getProducts } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";
import OrderSwitcher from "./OrderSwitcher";
import { Loader2, Search, X } from "lucide-react";

export default function ProductGrid() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activeCategoryId, setActiveCategoryId] = useState('favorites');
    const [isPending, startTransition] = useTransition();
    const [initialized, setInitialized] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        async function init() {
            try {
                const [p, c] = await Promise.all([
                    getProducts('favorites').catch(() => []),
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

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => {
            startTransition(async () => {
                try {
                    if (value.trim()) {
                        // Search across ALL products ignoring active category
                        const results = await getProducts(undefined, value.trim());
                        setProducts(results || []);
                    } else {
                        // Restore current category view
                        const results = await getProducts(activeCategoryId);
                        setProducts(results || []);
                    }
                } catch (error) {
                    console.error("Error searching products:", error);
                }
            });
        }, 300);
    };

    const handleCategorySelect = (id: string) => {
        setActiveCategoryId(id);
        setSearchQuery("");
        startTransition(async () => {
            try {
                const filtered = await getProducts(id);
                setProducts(filtered || []);
            } catch (error) {
                console.error("Error filtering category:", error);
            }
        });
    };

    const handleClear = () => {
        setSearchQuery("");
        startTransition(async () => {
            const results = await getProducts(activeCategoryId).catch(() => []);
            setProducts(results || []);
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

            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pb-24 pr-4 custom-scrollbar transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <span className="text-4xl mb-4">🔍</span>
                        <p className="text-lg font-medium">
                            {searchQuery ? `Sin resultados para "${searchQuery}"` : "No hay productos en esta categoría."}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
