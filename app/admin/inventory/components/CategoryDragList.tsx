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
import { GripVertical, MoreHorizontal, Loader2 } from "lucide-react";

import { updateCategoryOrders } from "@/app/actions/category";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryForm } from "./category-form";
import { CategoryColumn } from "./category-columns";

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
      <div className="flex items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <CategoryForm 
                category={category} 
                trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                        Editar categoría
                    </DropdownMenuItem>
                }
            />
            {/* Future wire-up: delete action */}
            <DropdownMenuItem className="text-destructive cursor-pointer">Eliminar categoría</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
      setCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Compute new order payload
        const updates = newItems.map((item, index) => ({
          id: item.id,
          sortOrder: index, // New order matches array index
        }));

        // Optimize visual state immediately, then send to DB
        startTransition(async () => {
           try {
               await updateCategoryOrders(updates);
           } catch (e) {
               console.error("Failed to update orders");
               setCategories(items); // revert on failure
           }
        });

        // Optimistically update sortOrder in UI state for children
        return newItems.map((item, index) => ({ ...item, sortOrder: index }));
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
