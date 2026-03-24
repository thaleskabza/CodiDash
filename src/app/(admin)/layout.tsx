import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar
        email={session.user.email ?? ""}
        name={session.user.name ?? "Admin"}
      />
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
