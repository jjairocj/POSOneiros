import NextAuth, { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { lockRemaining, recordFailure, recordSuccess } from "@/lib/login-throttle";

declare module "next-auth" {
    interface Session extends DefaultSession {
        user: {
            id: string;
            role: string;
        } & DefaultSession["user"];
    }

    interface User {
        id: string;
        role: string;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "correo@negocio.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const email = credentials.email.trim().toLowerCase();

                const remaining = lockRemaining(email);
                if (remaining > 0) {
                    const minutes = Math.ceil(remaining / 60000);
                    throw new Error(`LOCKED:${minutes}`);
                }

                const user = await prisma.user.findUnique({
                    where: { email },
                    include: { role: true }
                });

                // Same cost whether or not the user exists (no account enumeration by timing).
                const isPasswordValid = user
                    ? await bcrypt.compare(credentials.password, user.password)
                    : (await bcrypt.compare(credentials.password, "$2a$12$CwTycUXWue0Thq9StjUM0uJ8bSuw4t7Xbv9m0Rz8RVYbFJ4dwpXG6"), false);

                if (!user || !isPasswordValid) {
                    const r = recordFailure(email);
                    if (r.locked) throw new Error("LOCKED:15");
                    if (r.remainingAttempts <= 2) throw new Error(`ATTEMPTS:${r.remainingAttempts}`);
                    return null;
                }
                recordSuccess(email);

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role.name,
                };
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 12 * 60 * 60, // 12h: a shift, not a week
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
