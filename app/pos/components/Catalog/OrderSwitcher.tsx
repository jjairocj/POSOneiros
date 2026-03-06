import { useState } from "react";
import { useCartStore } from "@/app/store/useCartStore";
import { Button } from "@/components/ui/button";
import { X, Plus, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function OrderSwitcher() {
    const { orders, activeOrderId, setActiveOrder, addOrder, removeOrder } = useCartStore();
    
    // States for Modals
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newOrderName, setNewOrderName] = useState("");
    
    const [orderToRemove, setOrderToRemove] = useState<string | null>(null);

    const handleAddOrderConfirm = () => {
        if (newOrderName.trim()) {
            addOrder(newOrderName.trim());
            setNewOrderName("");
            setIsAddOpen(false);
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
                                    setOrderToRemove(order.id);
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
                onClick={() => setIsAddOpen(true)}
            >
                <Plus className="w-4 h-4 mr-1" />
                Nueva
            </Button>

            {/* Modal para Nueva Orden */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Nueva Cuenta</DialogTitle>
                        <DialogDescription>
                            Asigna un nombre para identificar este pedido o mesa.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Ej: Mesa 5, Cliente Juan..."
                            value={newOrderName}
                            onChange={(e) => setNewOrderName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddOrderConfirm()}
                            className="h-12 text-lg rounded-2xl bg-muted/50 border-transparent focus-visible:ring-primary focus-visible:bg-background transition-colors"
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="sm:justify-end">
                        <Button variant="ghost" className="rounded-xl w-full sm:w-auto" onClick={() => setIsAddOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            type="button" 
                            className="rounded-xl font-bold w-full sm:w-auto shadow-md"
                            onClick={handleAddOrderConfirm}
                            disabled={!newOrderName.trim()}
                        >
                            Crear Cuenta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal para Cerrar Orden */}
            <Dialog open={!!orderToRemove} onOpenChange={(open) => !open && setOrderToRemove(null)}>
                <DialogContent className="sm:max-w-sm rounded-[2rem] text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold text-center">¿Eliminar esta cuenta?</DialogTitle>
                            <DialogDescription className="text-center pt-2">
                                Se perderán todos los productos agregados a <br/><strong className="text-foreground">{orderToRemove ? orders[orderToRemove]?.name : ""}</strong>.
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 border-t pt-4">
                        <Button variant="ghost" className="rounded-xl w-full" onClick={() => setOrderToRemove(null)}>
                            Cancelar
                        </Button>
                        <Button 
                            variant="destructive"
                            className="rounded-xl font-bold w-full shadow-md"
                            onClick={() => {
                                if (orderToRemove) {
                                    removeOrder(orderToRemove);
                                    setOrderToRemove(null);
                                }
                            }}
                        >
                            Sí, eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
