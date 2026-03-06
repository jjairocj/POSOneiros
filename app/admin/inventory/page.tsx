import { Metadata } from 'next';
import { getProducts } from '@/app/actions/product';
import { columns } from './components/columns';
import { DataTable } from './components/data-table';
import { PackageOpen } from 'lucide-react';
import { ProductForm } from './components/product-form';

export const metadata: Metadata = {
    title: "Oneiros Admin | Inventario",
};

export default async function InventoryPage() {
    const products = await getProducts(); // Server-side fetch

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-10">
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <PackageOpen className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">Kardex de Inventario</h1>
                        <p className="text-muted-foreground mt-1 text-lg">Administra el catálogo de productos, existencias y costos.</p>
                    </div>
                </div>
                {/* Product Form Modal acts as the "Nuevo Producto" trigger */}
                <ProductForm />
            </header>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DataTable columns={columns} data={products} />
            </div>
        </div>
    );
}
