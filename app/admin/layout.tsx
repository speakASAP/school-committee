import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { tryGetCurrentUser } from "@/lib/auth/get-current-user";
import AdminNav from "./AdminNav";

const ADMIN_ROLES = new Set(["school_staff", "committee", "admin"]);

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await tryGetCurrentUser();
  if (!user || !user.roles.some((r) => ADMIN_ROLES.has(r))) {
    redirect("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <AdminNav />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
