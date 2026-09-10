"use client";

import { DataTable } from "@/app/admin/inventory/components/data-table";
import { createRegisterColumns, type RegisterColumn } from "./register-columns";
import { useMemo } from "react";

interface RegistersTableProps {
    registers: RegisterColumn[];
    branches: { id: string; name: string }[];
}

export function RegistersTable({ registers, branches }: RegistersTableProps) {
    const columns = useMemo(
        () => createRegisterColumns(branches),
        [branches]
    );
    return <DataTable columns={columns} data={registers} filterPlaceholder="Filtrar por nombre de caja..." emptyMessage="No se encontraron cajas. Crea una nueva o ajusta los filtros." />;
}
