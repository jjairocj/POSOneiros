"use client";
import { useEffect, useState, useTransition } from "react";
import ProductCard from "./ProductCard";
import CategorySelector from "./CategorySelector";
import { getProducts } from "@/app/actions/product";
import { getCategories } from "@/app/actions/category";
import OrderSwitcher from "./OrderSwitcher";
import { Loader2 } from "lucide-react";

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
            <div className="flex flex-col items-center justify-center h-full w-full text-muted-foreground opacity-70 min-h-[50vh]">
                <Loader2 className="h-10 w-10 animate-spin mb-4" />
                <span className="text-lg font-medium">Cargando catálogo...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full rounded-tr-3xl">
            <OrderSwitcher />
            
            <CategorySelector 
                categories={categories} 
                activeCategoryId={activeCategoryId} 
                onSelect={handleCategorySelect} 
            />
            
            <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pb-24 pr-4 custom-scrollbar transition-opacity duration-300 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {products && products.length > 0 ? (
                    products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground opacity-60">
                        <span className="text-4xl mb-4">🔍</span>
                        <p className="text-lg font-medium">No hay productos en esta categoría.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

