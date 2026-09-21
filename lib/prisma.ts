import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * pg currently treats sslmode=prefer|require|verify-ca as verify-full and
 * prints a SECURITY WARNING about it changing in pg v9. Say verify-full
 * explicitly (same behavior as today, so nothing changes at runtime) instead
 * of asking everyone to edit their DATABASE_URL.
 */
export function withExplicitSslMode(url: string | undefined): string | undefined {
    if (!url) return url;
    return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/, "$1verify-full");
}

const connectionString = withExplicitSslMode(process.env.DATABASE_URL);

const prismaClientSingleton = () => {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
};

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
