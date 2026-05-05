"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RegisterFormModal } from "./RegisterFormModal";
import { deleteRegister } from "@/app/actions/registers";
import { useState } from "react";

export type RegisterColumn = {
    id: string;
    name: string;
    prefix: string | null;
    branch: { id: string; name: string };
};

function RegisterActions({
    register,
    branches,
}: {
    register: RegisterColumn;
    branches: { id: string; name: string }[];
}) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`¿Eliminar la caja "${register.name}"?`)) return;
        setLoading(true);
        const result = await deleteRegister(register.id);
        if (!result.success) {
            alert(result.error || "Error al eliminar.");
        }
        setLoading(false);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={loading}>
                    <span className="sr-only">Abrir menú</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <RegisterFormModal
                    register={register}
                    branches={branches}
                    trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Editar caja
                        </DropdownMenuItem>
                    }
                />
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                >
                    Eliminar caja
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function createRegisterColumns(
    branches: { id: string; name: string }[]
): ColumnDef<RegisterColumn>[] {
    return [
        {
            accessorKey: "name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4 hover:bg-transparent"
                >
                    Nombre
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="font-semibold">{row.getValue("name")}</div>
            ),
        },
        {
            accessorKey: "prefix",
            header: "Prefijo",
            cell: ({ row }) => (
                <div className="font-mono text-sm text-muted-foreground">
                    {row.getValue("prefix") || "—"}
                </div>
            ),
        },
        {
            id: "branch",
            header: "Sucursal",
            cell: ({ row }) => (
                <div className="text-muted-foreground">
                    {row.original.branch?.name || "—"}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <RegisterActions register={row.original} branches={branches} />
            ),
        },
    ];
}
