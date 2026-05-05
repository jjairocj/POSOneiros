import { Metadata } from "next";
import { getUsers, getRoles, getBranches } from "@/app/actions/users";
import { getRegisters } from "@/app/actions/registers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MonitorSmartphone } from "lucide-react";
import { UserFormModal } from "./components/UserFormModal";
import { RegisterFormModal } from "./components/RegisterFormModal";
import { UsersTable } from "./components/UsersTable";
import { RegistersTable } from "./components/RegistersTable";

export const metadata: Metadata = {
    title: "Oneiros Admin | Usuarios y Cajas",
};

export default async function UsersPage() {
    const [users, registers, roles, branches] = await Promise.all([
        getUsers(),
        getRegisters(),
        getRoles(),
        getBranches(),
    ]);

    const slimRoles = roles.map((r) => ({ id: r.id, name: r.name }));
    const slimBranches = branches.map((b) => ({ id: b.id, name: b.name }));

    const userRows = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: { id: u.role.id, name: u.role.name },
        branch: u.branch ? { id: u.branch.id, name: u.branch.name } : null,
    }));

    const registerRows = registers.map((r) => ({
        id: r.id,
        name: r.name,
        prefix: r.prefix,
        branch: { id: r.branch.id, name: r.branch.name },
    }));

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center mb-10">
                <div className="flex gap-4 items-center">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <Users className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-foreground tracking-tight">
                            Usuarios y Cajas
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            Administra los usuarios del sistema y las cajas registradoras.
                        </p>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="users" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-2xl">
                    <TabsTrigger
                        value="users"
                        className="rounded-xl px-6 font-bold flex items-center gap-2"
                    >
                        <Users className="w-4 h-4" /> Usuarios
                    </TabsTrigger>
                    <TabsTrigger
                        value="registers"
                        className="rounded-xl px-6 font-bold flex items-center gap-2"
                    >
                        <MonitorSmartphone className="w-4 h-4" /> Cajas
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    value="users"
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none space-y-4"
                >
                    <div className="flex justify-end">
                        <UserFormModal roles={slimRoles} branches={slimBranches} />
                    </div>
                    <UsersTable users={userRows} roles={slimRoles} branches={slimBranches} />
                </TabsContent>

                <TabsContent
                    value="registers"
                    className="animate-in fade-in slide-in-from-bottom-4 duration-500 m-0 border-none p-0 outline-none space-y-4"
                >
                    <div className="flex justify-end">
                        <RegisterFormModal branches={slimBranches} />
                    </div>
                    <RegistersTable registers={registerRows} branches={slimBranches} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
