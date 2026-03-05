"use client";
import { useCartStore } from "@/app/store/useCartStore";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

export default function OrderSwitcher() {
    const { orders, activeOrderId, setActiveOrder, addOrder, removeOrder } = useCartStore();

    const handleAddOrder = () => {
        const name = prompt("Nombre del nuevo pedido (ej: Mesa 5, Cliente Juan):");
        if (name) {
            addOrder(name);
        }
    };

    return (
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {Object.values(orders).map((order) => {
                const isActive = activeOrderId === order.id;
                return (
                    <div 
                        key={order.id} 
                        className={`group flex items-center gap-2 px-4 py-2 rounded-full border cursor-pointer transition-all whitespace-nowrap
                        ${isActive ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card text-card-foreground hover:bg-accent border-border"}`}
                        onClick={() => setActiveOrder(order.id)}
                    >
                        <span className="text-sm font-medium">{order.name}</span>
                        {Object.keys(orders).length > 1 && (
                            <button 
                                className={`flex items-center justify-center rounded-full p-0.5 transition-colors
                                ${isActive ? "hover:bg-primary-foreground/20 text-primary-foreground" : "hover:bg-destructive hover:text-destructive-foreground text-muted-foreground opacity-50 group-hover:opacity-100"}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`¿Cerrar la orden "${order.name}"?`)) {
                                        removeOrder(order.id);
                                    }
                                }}
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                );
            })}
            <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full shadow-sm ml-2 flex-shrink-0"
                onClick={handleAddOrder}
            >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
            </Button>
        </div>
    );
}
