import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "⊞" },
  { href: "/admin/orders", label: "Orders", icon: "📋" },
  { href: "/admin/drivers", label: "Drivers", icon: "🚗" },
  { href: "/admin/revenue", label: "Revenue", icon: "💰" },
  { href: "/admin/fraud", label: "Fraud", icon: "⚠" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4 flex-shrink-0">
        <div className="mb-6 px-2">
          <p className="text-lg font-bold text-green-700">CodiDash</p>
          <p className="text-xs text-gray-400">Admin Portal</p>
        </div>
        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-2 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">{session.user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
