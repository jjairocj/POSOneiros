"use client";
import { useCartStore } from "@/app/store/useCartStore";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { toggleProductFavorite } from "@/app/actions/product";
import { useState, useTransition } from "react";

interface ProductCardProps {
    product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
    const addItem = useCartStore((state) => state.addItem);
    const [isFavorite, setIsFavorite] = useState(product.isFavorite || false);
    const [isPending, startTransition] = useTransition();
    const [added, setAdded] = useState(false);

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isFavorite;
        setIsFavorite(newState);
        startTransition(async () => {
            try {
                await toggleProductFavorite(product.id, newState);
            } catch {
                setIsFavorite(!newState);
            }
        });
    };

    const handleAdd = () => {
        addItem(product);
        // Brief visual feedback on the card itself
        setAdded(true);
        setTimeout(() => setAdded(false), 600);
    };

    const isOutOfStock = product.stock === 0;

    return (
        <div
            onClick={isOutOfStock ? undefined : handleAdd}
            className={[
                "group relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 select-none",
                "bg-card border-border/60",
                isOutOfStock
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer hover:scale-[1.03] hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 active:scale-[0.98]",
                added ? "ring-2 ring-primary/60 scale-[1.03] -translate-y-1" : "",
            ].join(" ")}
        >
            {/* Image area */}
            <div className="aspect-square bg-muted/50 flex items-center justify-center overflow-hidden relative">
                {product.imageUrl ? (
                    <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <span className="text-4xl opacity-20">📦</span>
                )}

                {/* Favorite toggle */}
                <button
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className="absolute top-2 left-2 w-9 h-9 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-border/50 shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
                >
                    <Star
                        className={`w-4 h-4 transition-colors ${
                            isFavorite
                                ? "fill-yellow-400 text-yellow-500"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    />
                </button>

                {/* Stock badges */}
                {isOutOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                        <Badge variant="destructive" className="text-xs font-bold shadow">Agotado</Badge>
                    </div>
                )}
                {!isOutOfStock && product.stock <= 5 && (
                    <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm z-10 text-[10px]">
                        ¡Poco Stock!
                    </Badge>
                )}

                {/* "Añadido" flash */}
                {added && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20 backdrop-blur-sm animate-in fade-in zoom-in duration-150 pointer-events-none">
                        <span className="text-2xl font-black text-primary">+1</span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-0.5">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight text-card-foreground">
                    {product.name}
                </h3>
                <p className="text-primary font-bold text-sm mt-1">
                    ${product.price.toLocaleString()}
                </p>
            </div>
        </div>
    );
}
