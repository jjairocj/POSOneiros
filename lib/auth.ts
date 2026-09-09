import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export type Role = "ADMIN" | "CASHIER" | "SUPERVISOR";

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export class AuthError extends Error {
    constructor(message = "No autenticado") {
        super(message);
        this.name = "AuthError";
    }
}

/**
 * Returns the authenticated user or throws.
 * Pass one or more roles to also require a role (ADMIN always passes).
 */
export async function requireSession(...roles: Role[]): Promise<SessionUser> {
    const session = await getServerSession(authOptions);
    const user = session?.user as Partial<SessionUser> | undefined;
    if (!user?.id) throw new AuthError();

    const role = (user.role ?? "CASHIER") as Role;
    if (roles.length > 0 && role !== "ADMIN" && !roles.includes(role)) {
        throw new AuthError("No tienes permisos para esta acción");
    }

    return { id: user.id, name: user.name ?? "", email: user.email ?? "", role };
}

export const requireAdmin = () => requireSession("ADMIN");
