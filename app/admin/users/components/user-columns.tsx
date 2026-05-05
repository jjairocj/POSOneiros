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
import { UserFormModal } from "./UserFormModal";
import { deleteUser } from "@/app/actions/users";
import { useState } from "react";

export type UserColumn = {
    id: string;
    name: string;
    email: string;
    role: { id: string; name: string };
    branch: { id: string; name: string } | null;
};

function UserActions({
    user,
    roles,
    branches,
}: {
    user: UserColumn;
    roles: { id: string; name: string }[];
    branches: { id: string; name: string }[];
}) {
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`¿Eliminar al usuario "${user.name}"?`)) return;
        setLoading(true);
        const result = await deleteUser(user.id);
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
                <UserFormModal
                    user={user}
                    roles={roles}
                    branches={branches}
                    trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            Editar usuario
                        </DropdownMenuItem>
                    }
                />
                <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                >
                    Eliminar usuario
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function createUserColumns(
    roles: { id: string; name: string }[],
    branches: { id: string; name: string }[]
): ColumnDef<UserColumn>[] {
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
            accessorKey: "email",
            header: "Email",
            cell: ({ row }) => (
                <div className="text-muted-foreground text-sm">{row.getValue("email")}</div>
            ),
        },
        {
            id: "role",
            header: "Rol",
            cell: ({ row }) => {
                const roleName: string = row.original.role?.name || "—";
                const colorMap: Record<string, string> = {
                    ADMIN: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
                    SUPERVISOR: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
                    CASHIER: "bg-green-500/15 text-green-700 dark:text-green-300",
                };
                return (
                    <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            colorMap[roleName] || "bg-muted text-muted-foreground"
                        }`}
                    >
                        {roleName}
                    </span>
                );
            },
        },
        {
            id: "branch",
            header: "Sucursal",
            cell: ({ row }) => (
                <div className="text-muted-foreground">
                    {row.original.branch?.name || "Sin asignar"}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <UserActions
                    user={row.original}
                    roles={roles}
                    branches={branches}
                />
            ),
        },
    ];
}
