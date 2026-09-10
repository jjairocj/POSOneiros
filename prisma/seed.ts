import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    console.log("Seeding Database...");

    const adminRole = await prisma.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: {
            name: "ADMIN",
            permissions: ["ALL"],
        },
    });

    await prisma.role.upsert({
        where: { name: "SUPERVISOR" },
        update: {},
        create: { name: "SUPERVISOR", permissions: ["POS", "REPORTS", "INVENTORY", "VOID_SALE"] },
    });

    await prisma.role.upsert({
        where: { name: "CASHIER" },
        update: {},
        create: { name: "CASHIER", permissions: ["POS"] },
    });

    const branch = await prisma.branch.upsert({
        where: { id: "branch-1" },
        update: {},
        create: {
            id: "branch-1",
            name: "Sucursal Principal",
            address: "Calle 123",
        }
    });

    const register = await prisma.register.upsert({
        where: { id: "caja-1" },
        update: {},
        create: {
            id: "caja-1",
            name: "Caja Principal",
            branchId: branch.id,
            prefix: "POS-1",
        }
    });

    const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
        throw new Error("Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD en .env antes de ejecutar el seed.");
    }
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "true") {
        throw new Error("El seed está bloqueado en producción. Usa ALLOW_SEED=true solo para la primera carga.");
    }
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const user = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            name: "Administrador",
            email: adminEmail,
            password: passwordHash,
            roleId: adminRole.id,
            branchId: branch.id,
        },
    });

    const catBebidas = await prisma.category.upsert({
        where: { id: "cat-bebidas" },
        update: {},
        create: { id: "cat-bebidas", name: "Bebidas" }
    });

    const catSnacks = await prisma.category.upsert({
        where: { id: "cat-snacks" },
        update: {},
        create: { id: "cat-snacks", name: "Snacks" }
    });

    const products = [
        { name: "Coca Cola 500ml", code: "7701", price: 3500, categoryId: catBebidas.id, stock: 50 },
        { name: "Agua Cristal 600ml", code: "7702", price: 2000, categoryId: catBebidas.id, stock: 100 },
        { name: "Papas Margarita Pollo", code: "8801", price: 2500, categoryId: catSnacks.id, stock: 30 },
        { name: "Chocoramo", code: "8802", price: 2200, categoryId: catSnacks.id, stock: 40 },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { code: p.code },
            update: p,
            create: p
        });
    }

    console.log("Seed complete. Default user:", user.email, "Password: (hashed)");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
