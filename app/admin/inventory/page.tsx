import { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getProducts, getStockMovements } from '@/app/actions/product';
import { getCategories } from '@/app/actions/category';
import { columns } from './components/columns';
import { categoryColumns } from './components/category-columns';
import { DataTable } from './components/data-table';
import { PackageOpen, FolderTree, FileSpreadsheet, History } from 'lucide-react';
import { MovementsTable } from './components/MovementsTable';
import { ProductForm } from './components/product-form';
import { CategoryForm } from './components/category-form';
import { CategoryDragList } from './components/CategoryDragList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
    title: "Oneiros Admin | Inventario",
};

export default async function InventoryPage() {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";
    const products = await getProducts(undefined, undefined, { includeInactive: true });
    const categories = await getCategories();
    const movements = await getStockMovements({ take: 300 });

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
                {isAdmin && (
                    <Link
                        href="/admin/inventory/import"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm transition-colors"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Importar desde Siigo
                    </Link>
                )}
            </header>

            <Tabs defaultValue="products" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="products" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <PackageOpen className="w-4 h-4" /> Productos
                    </TabsTrigger>
                    <TabsTrigger value="categories" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <FolderTree className="w-4 h-4" /> Categorías y Orden
                    </TabsTrigger>
                    <TabsTrigger value="movements" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <History className="w-4 h-4" /> Movimientos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="movements" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                    <MovementsTable rows={movements} />
                </TabsContent>

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
