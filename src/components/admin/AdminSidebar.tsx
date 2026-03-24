"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "⊞" },
  { href: "/admin/orders", label: "Orders", icon: "📋" },
  { href: "/admin/drivers", label: "Drivers", icon: "🚗" },
  { href: "/admin/revenue", label: "Revenue", icon: "💰" },
  { href: "/admin/fraud", label: "Fraud", icon: "⚠" },
];

interface AdminSidebarProps {
  email: string;
  name: string;
}

export function AdminSidebar({ email, name }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col py-6 px-4 flex-shrink-0">
      <div className="mb-6 px-2">
        <p className="text-lg font-bold text-green-700">CodiDash</p>
        <p className="text-xs text-gray-400">Admin Portal</p>
      </div>

      <nav className="space-y-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-green-50 text-green-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User info + sign out */}
      <div className="px-2 pt-4 border-t border-gray-100 space-y-2">
        <div title={email}>
          <p className="text-xs font-medium text-gray-700 truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">{email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <span>→</span>
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
