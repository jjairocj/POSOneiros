"use client";
import { Badge } from "@/components/ui/badge";

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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <Badge 
                variant={activeCategoryId === 'all' ? "default" : "secondary"}
                className={`cursor-pointer px-4 py-1.5 text-sm whitespace-nowrap transition-colors
                           ${activeCategoryId !== 'all' && 'hover:bg-primary/20 hover:text-primary'}`}
                onClick={() => onSelect('all')}
            >
                🔥 Todo
            </Badge>
            {categories.map((cat) => (
                <Badge
                    key={cat.id}
                    variant={activeCategoryId === cat.id ? "default" : "secondary"}
                    className={`cursor-pointer px-4 py-1.5 text-sm whitespace-nowrap transition-colors
                               ${activeCategoryId !== cat.id && 'hover:bg-primary/20 hover:text-primary'}`}
                    onClick={() => onSelect(cat.id)}
                >
                    {cat.name}
                </Badge>
            ))}
        </div>
    );
}
