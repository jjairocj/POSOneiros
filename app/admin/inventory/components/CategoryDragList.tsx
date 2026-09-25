"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Pencil, Trash2 } from "lucide-react";

import { deleteCategory, updateCategoryOrders } from "@/app/actions/category";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CategoryForm } from "./category-form";
import { CategoryColumn } from "./category-columns";

/** Two-tap delete: first tap asks (button turns red), second confirms. */
function DeleteCategoryButton({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resetTimer.current) clearTimeout(resetTimer.current); }, []);

  const handle = async () => {
    if (!confirming) {
      setConfirming(true);
      resetTimer.current = setTimeout(() => setConfirming(false), 4000);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setLoading(true);
    try {
      const res = await deleteCategory(categoryId);
      if (res.success) toast.success(`Categoría "${categoryName}" eliminada.`);
      else toast.error(res.error || "No se pudo eliminar.");
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-8 w-8 rounded-lg ${confirming ? "bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive" : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"}`}
      title={confirming ? "¿Seguro? Toca de nuevo para eliminar" : "Eliminar categoría"}
      onClick={handle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      <span className="sr-only">{confirming ? "¿Seguro? Toca de nuevo para eliminar" : "Eliminar categoría"}</span>
    </Button>
  );
}

interface CategoryDragListProps {
  initialCategories: CategoryColumn[];
}

function SortableCategoryItem({ category, isPending }: { category: CategoryColumn, isPending: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 mb-3 bg-card border border-border shadow-sm rounded-2xl ${
        isDragging ? "shadow-md border-primary/50" : "hover:border-primary/20 hover:shadow-md transition-all"
      } ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        
        {/* Category Info */}
        <div className="flex flex-col">
          <span className="font-bold text-lg">{category.name}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {category._count ? `${category._count.products} productos` : 'Sin productos'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <CategoryForm
            category={category}
            trigger={
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" title="Editar categoría">
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Editar categoría</span>
                </Button>
            }
        />
        <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
      </div>
    </div>
  );
}

export function CategoryDragList({ initialCategories }: CategoryDragListProps) {
  const [categories, setCategories] = useState(initialCategories);
  const [isPending, startTransition] = useTransition();

  // Sync if parent updates
  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { // Handles mouse and touch smoothly
      activationConstraint: {
        distance: 5, // Requires 5px movement before dragging starts (allows buttons inside to be clicked)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = categories.findIndex((item) => item.id === active.id);
      const newIndex = categories.findIndex((item) => item.id === over?.id);

      const newItems = arrayMove(categories, oldIndex, newIndex);
        
      // Optimistically update sortOrder in UI state
      const optimisticItems = newItems.map((item, index) => ({ ...item, sortOrder: index }));
      setCategories(optimisticItems);

      // Compute new order payload
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sortOrder: index, // New order matches array index
      }));

      // Fire side effect and DB update outside of setState
      startTransition(async () => {
         try {
             const result = await updateCategoryOrders(updates);
             if (!result.success) {
                 throw new Error(result.error);
             }
         } catch (e) {
             console.error("Failed to update orders");
             setCategories(categories); // revert on failure
         }
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-2 relative">
       {isPending && (
           <div className="absolute -top-6 right-0 flex items-center gap-2 text-sm text-muted-foreground font-medium animate-pulse">
               <Loader2 className="h-4 w-4 animate-spin" /> Guardando orden...
           </div>
       )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {categories.map((cat) => (
            <SortableCategoryItem key={cat.id} category={cat} isPending={isPending} />
          ))}
        </SortableContext>
      </DndContext>
      
      {categories.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
              No hay categorías. Crea una nueva.
          </div>
      )}
    </div>
  );
}
