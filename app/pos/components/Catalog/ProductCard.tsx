"use client";
import { useCartStore } from "@/app/store/useCartStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
    product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
    const addItem = useCartStore((state) => state.addItem);

    return (
        <Card 
            className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 relative"
            onClick={() => addItem(product)}
        >
            <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                {product.imageUrl ? (
                    <img 
                        src={product.imageUrl} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <span className="text-4xl opacity-20">📦</span>
                )}
                {product.stock <= 5 && (
                    <Badge variant="destructive" className="absolute top-2 right-2 shadow-sm">
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
