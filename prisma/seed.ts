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

    const passwordHash = await bcrypt.hash("HurremCochina#1", 10);

    const user = await prisma.user.upsert({
        where: { email: "jhon_jairo@live.com" },
        update: {},
        create: {
            name: "Jhon Jairo",
            email: "jhon_jairo@live.com",
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
