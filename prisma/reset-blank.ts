/**
 * Deja la base de datos en blanco para un cliente nuevo: borra TODAS las ventas,
 * productos, turnos, usuarios, etc. y deja solo los 3 roles y un único usuario
 * ADMIN con el correo que definas.
 *
 * NO se ejecuta automáticamente en ningún build/deploy. Se corre a mano cuando
 * quieras resetear una base (por ejemplo, antes de entregarla a un cliente nuevo).
 *
 * Uso:
 *   DATABASE_URL="<direct, sin -pooler>" \
 *   RESET_ADMIN_EMAIL="correo@delcliente.com" \
 *   npx tsx prisma/reset-blank.ts
 *
 * Te pedirá la contraseña del admin de forma interactiva y una confirmación
 * escrita antes de borrar nada. Usa el endpoint DIRECTO de Neon (sin
 * "-pooler"), igual que para prisma migrate — ver .env.example.
 */
import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

async function ask(question: string): Promise<string> {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    try {
        return (await rl.question(question)).trim();
    } finally {
        rl.close();
    }
}

async function main() {
    const adminEmail = process.env.RESET_ADMIN_EMAIL?.trim().toLowerCase();
    if (!adminEmail) {
        throw new Error("Define RESET_ADMIN_EMAIL antes de ejecutar este script.");
    }

    const [userCount, saleCount, productCount] = await Promise.all([
        prisma.user.count(),
        prisma.sale.count(),
        prisma.product.count(),
    ]);

    console.log(`Base de datos: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ":****@")}`);
    console.log(`Se borrará TODO: ${userCount} usuarios, ${saleCount} ventas, ${productCount} productos (y todo lo demás).`);
    console.log(`Al final quedará solo un usuario ADMIN: ${adminEmail}`);
    console.log("");

    const confirm1 = await ask('Esto es IRREVERSIBLE. Escribe "BORRAR TODO" para continuar: ');
    if (confirm1 !== "BORRAR TODO") {
        console.log("Cancelado.");
        process.exit(1);
    }

    const confirm2 = await ask(`Última confirmación: escribe el correo exacto (${adminEmail}) para confirmar: `);
    if (confirm2.trim().toLowerCase() !== adminEmail) {
        console.log("El correo no coincide. Cancelado.");
        process.exit(1);
    }

    const adminPassword = await ask("Contraseña para el nuevo usuario admin: ");
    if (adminPassword.length < 8) {
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
    }

    console.log("\nBorrando datos...");

    // Orden seguro respetando llaves foráneas: hijos antes que padres.
    await prisma.payment.deleteMany({});
    await prisma.saleDetail.deleteMany({});
    await prisma.subAccount.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.shift.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.register.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.systemConfig.deleteMany({});

    console.log("Recreando estructura base (roles, sucursal, caja, admin)...");

    const adminRole = await prisma.role.create({
        data: { name: "ADMIN", permissions: ["ALL"] },
    });
    await prisma.role.create({
        data: { name: "SUPERVISOR", permissions: ["VIEW_DASHBOARD", "MANAGE_CATALOG", "RECEIVE_INVENTORY", "VOID_SALE", "VIEW_REPORTS"] },
    });
    await prisma.role.create({
        data: { name: "CASHIER", permissions: ["POS"] },
    });

    const branch = await prisma.branch.create({
        data: { name: "Sucursal Principal" },
    });

    await prisma.register.create({
        data: { name: "Caja Principal", branchId: branch.id, prefix: "POS-1" },
    });

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const admin = await prisma.user.create({
        data: {
            name: "Administrador",
            email: adminEmail,
            password: passwordHash,
            roleId: adminRole.id,
            branchId: branch.id,
        },
    });

    console.log(`\nListo. Base en blanco con un único usuario admin: ${admin.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
