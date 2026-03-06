import { Metadata } from 'next';
import { getProducts } from '@/app/actions/product';
import { getCategories } from '@/app/actions/category';
import { columns } from './components/columns';
import { categoryColumns } from './components/category-columns';
import { DataTable } from './components/data-table';
import { PackageOpen, FolderTree } from 'lucide-react';
import { ProductForm } from './components/product-form';
import { CategoryForm } from './components/category-form';
import { CategoryDragList } from './components/CategoryDragList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
    title: "Oneiros Admin | Inventario",
};

export default async function InventoryPage() {
    const products = await getProducts(); // Server-side fetch products
    const categories = await getCategories(); // Server-side fetch categories

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-10">
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <PackageOpen className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">Inventario y Categorías</h1>
                        <p className="text-muted-foreground mt-1 text-lg">Administra el catálogo de productos y el orden del POS.</p>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="products" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="products" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <PackageOpen className="w-4 h-4" /> Productos
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <FolderTree className="w-4 h-4" /> Categorías y Orden
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="products" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none space-y-4">
                    <div className="flex justify-end">
                        <ProductForm />
                    </div>
                    <DataTable columns={columns} data={products} />
                </TabsContent>

                <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none space-y-4">
                    <div className="flex justify-end">
                        <CategoryForm />
                    </div>
                    <div className="bg-transparent border-none p-0 shadow-none">
                        <CategoryDragList initialCategories={categories} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
