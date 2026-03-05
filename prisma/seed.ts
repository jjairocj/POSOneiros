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
