"use client";
import { useCartStore } from "@/app/store/useCartStore";
import { Card, CardContent } from "@/components/ui/card";
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

    const handleToggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        const newState = !isFavorite;
        setIsFavorite(newState);
        startTransition(async () => {
            try {
                await toggleProductFavorite(product.id, newState);
            } catch (error) {
                console.error("Error toggling favorite:", error);
                setIsFavorite(!newState); // revert on error
            }
        });
    };

    return (
        <Card 
            className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 relative"
            onClick={() => addItem(product)}
        >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                {product.imageUrl ? (
                    <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <span className="text-4xl opacity-20">📦</span>
                )}
                
                {/* Favorite Toggle Button */}
                <button 
                    onClick={handleToggleFavorite}
                    disabled={isPending}
                    className="absolute top-2 left-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
                >
                    <Star 
                        className={`w-5 h-5 transition-colors ${
                            isFavorite 
                                ? "fill-yellow-400 text-yellow-500" 
                                : "text-muted-foreground hover:text-foreground"
                        }`} 
                    />
                </button>

                {product.stock <= 5 && (
                    <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm z-10">
                        ¡Poco Stock!
                    </Badge>
                )}
            </div>
            <CardContent className="p-4 flex flex-col gap-1">
                <h3 className="font-semibold text-sm line-clamp-2 leading-tight">
                    {product.name}
                </h3>
                <p className="text-primary font-bold mt-1">
                    ${product.price.toLocaleString()}
                </p>
            </CardContent>
        </Card>
    );
}
