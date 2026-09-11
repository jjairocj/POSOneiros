import { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getEffectivePermissions, hasPermission } from '@/lib/auth';
import { getProducts, getStockMovements } from '@/app/actions/product';
import { getCategories } from '@/app/actions/category';
import { getRawMaterials } from '@/app/actions/lots';
import { getSuppliers } from '@/app/actions/suppliers';
import { ProductsTab } from './components/ProductsTab';
import { categoryColumns } from './components/category-columns';
import { PackageOpen, FolderTree, FileSpreadsheet, History, FlaskConical, Truck } from 'lucide-react';
import { MovementsTable } from './components/MovementsTable';
import { CategoryForm } from './components/category-form';
import { CategoryDragList } from './components/CategoryDragList';
import { RawMaterialsTable } from './components/RawMaterialsTable';
import { SuppliersTable } from './components/SuppliersTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata: Metadata = {
    title: "Oneiros Admin | Inventario",
};

export default async function InventoryPage() {
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === "ADMIN";
    const permissions = await getEffectivePermissions();
    const canManageCatalog = hasPermission(permissions, "MANAGE_CATALOG");
    const canReceiveInventory = hasPermission(permissions, "RECEIVE_INVENTORY");

    const products = await getProducts(undefined, undefined, { includeInactive: true });
    const categories = canManageCatalog ? await getCategories() : [];
    const movements = canReceiveInventory ? await getStockMovements({ take: 300 }) : [];
    const rawMaterials = canReceiveInventory ? await getRawMaterials() : [];
    const suppliers = canReceiveInventory ? await getSuppliers() : [];
    const defaultTab = canManageCatalog ? "products" : canReceiveInventory ? "movements" : "products";

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

            <Tabs defaultValue={defaultTab} className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger value="products" className="rounded-xl px-6 font-bold flex items-center gap-2">
                        <PackageOpen className="w-4 h-4" /> Productos
                    </TabsTrigger>
                    {canManageCatalog && (
                        <TabsTrigger value="categories" className="rounded-xl px-6 font-bold flex items-center gap-2">
                            <FolderTree className="w-4 h-4" /> Categorías y Orden
                        </TabsTrigger>
                    )}
                    {canReceiveInventory && (
                        <>
                            <TabsTrigger value="movements" className="rounded-xl px-6 font-bold flex items-center gap-2">
                                <History className="w-4 h-4" /> Movimientos
                            </TabsTrigger>
                            <TabsTrigger value="insumos" className="rounded-xl px-6 font-bold flex items-center gap-2">
                                <FlaskConical className="w-4 h-4" /> Insumos
                            </TabsTrigger>
                            <TabsTrigger value="suppliers" className="rounded-xl px-6 font-bold flex items-center gap-2">
                                <Truck className="w-4 h-4" /> Proveedores
                            </TabsTrigger>
                        </>
                    )}
                </TabsList>

                {canReceiveInventory && (
                    <TabsContent value="movements" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                        <MovementsTable rows={movements} />
                    </TabsContent>
                )}

                <TabsContent value="products" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none space-y-4">
                    {/* Cashier with only RECEIVE_INVENTORY sees the catalog read-only —
                        no "new product" button, and RowActions hides edit/delete itself. */}
                    <ProductsTab data={products} canManageCatalog={canManageCatalog} canReceiveInventory={canReceiveInventory} />
                </TabsContent>

                {canManageCatalog && (
                    <TabsContent value="categories" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none space-y-4">
                        <div className="flex justify-end">
                            <CategoryForm />
                        </div>
                        <div className="bg-transparent border-none p-0 shadow-none">
                            <CategoryDragList initialCategories={categories} />
                        </div>
                    </TabsContent>
                )}

                {canReceiveInventory && (
                    <TabsContent value="insumos" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                        <RawMaterialsTable materials={rawMaterials} suppliers={suppliers} />
                    </TabsContent>
                )}

                {canReceiveInventory && (
                    <TabsContent value="suppliers" className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none">
                        <SuppliersTable suppliers={suppliers} />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
