/**
 * Carga inicial mínima para una base de datos NUEVA (sin datos de demostración):
 * roles, sucursal, caja y el usuario administrador. Es idempotente y sólo crea
 * el administrador si todavía no existe ningún usuario. Lo ejecuta entrypoint.sh
 * en cada arranque, después de las migraciones.
 */
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    // Roles: se aseguran siempre (el sistema los da por hechos).
    const adminRole = await prisma.role.upsert({ where: { name: "ADMIN" }, update: {}, create: { name: "ADMIN", permissions: ["ALL"] } });
    await prisma.role.upsert({
        where: { name: "SUPERVISOR" }, update: {},
        create: { name: "SUPERVISOR", permissions: ["VIEW_DASHBOARD", "MANAGE_CATALOG", "RECEIVE_INVENTORY", "VOID_SALE", "VIEW_REPORTS"] },
    });
    await prisma.role.upsert({ where: { name: "CASHIER" }, update: {}, create: { name: "CASHIER", permissions: ["POS"] } });

    if ((await prisma.user.count()) > 0) {
        console.log("[bootstrap] Ya existen usuarios: no se crea el administrador.");
        return;
    }

    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password || password.length < 8) {
        throw new Error("Base de datos vacía: define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) para crear el primer administrador.");
    }

    const branch = await prisma.branch.upsert({
        where: { id: "branch-1" }, update: {},
        create: { id: "branch-1", name: process.env.BUSINESS_NAME?.trim() || "Sucursal Principal" },
    });
    await prisma.register.upsert({
        where: { id: "caja-1" }, update: {},
        create: { id: "caja-1", name: "Caja Principal", prefix: "POS-1", branchId: branch.id },
    });
    await prisma.user.create({
        data: { name: "Administrador", email, password: await bcrypt.hash(password, 12), roleId: adminRole.id, branchId: branch.id },
    });
    console.log(`[bootstrap] Administrador creado: ${email}`);
}

main()
    .catch((e) => { console.error("[bootstrap]", e.message ?? e); process.exit(1); })
    .finally(() => prisma.$disconnect());
