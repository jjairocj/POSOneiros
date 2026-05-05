/**
 * @file page.tsx — Root route `/`
 * @description Smart redirect entry point. Reads the server-side NextAuth
 * session and routes the user to the correct destination without rendering any
 * visible UI:
 *
 * | Condition              | Destination |
 * |------------------------|-------------|
 * | No session             | `/login`    |
 * | Session, role = ADMIN  | `/admin`    |
 * | Session, any other role| `/pos`      |
 *
 * This replaces the previous static landing page and eliminates the extra
 * navigation step every user had to make after authentication.
 */

import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if ((session.user as any).role === "ADMIN") {
    redirect("/admin");
  }

  redirect("/pos");
}
