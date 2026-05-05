"use client";

import { DataTable } from "@/app/admin/inventory/components/data-table";
import { createUserColumns, type UserColumn } from "./user-columns";
import { useMemo } from "react";

interface UsersTableProps {
    users: UserColumn[];
    roles: { id: string; name: string }[];
    branches: { id: string; name: string }[];
}

export function UsersTable({ users, roles, branches }: UsersTableProps) {
    const columns = useMemo(
        () => createUserColumns(roles, branches),
        [roles, branches]
    );
    return <DataTable columns={columns} data={users} />;
}
