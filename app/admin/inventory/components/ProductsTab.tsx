"use client";
import { buildColumns, type ProductColumn } from "./columns";
import { DataTable } from "./data-table";
import { ProductForm } from "./product-form";

/**
 * Thin client wrapper around buildColumns(): Next.js forbids calling an
 * exported function from a "use client" module (columns.tsx) directly from
 * a Server Component — only importing/rendering its Client Component
 * exports is allowed. Calling buildColumns() from *within* this client
 * component's own render is fine, since that's a client-to-client call.
 */
export function ProductsTab({
    data,
    canManageCatalog,
    canReceiveInventory,
}: {
    data: ProductColumn[];
    canManageCatalog: boolean;
    canReceiveInventory: boolean;
}) {
    return (
        <div className="space-y-4">
            {canManageCatalog && (
                <div className="flex justify-end">
                    <ProductForm />
                </div>
            )}
            <DataTable columns={buildColumns({ canManageCatalog, canReceiveInventory })} data={data} />
        </div>
    );
}
