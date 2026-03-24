"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/driver", label: "Dashboard", icon: "🏠" },
  { href: "/driver/orders", label: "My Orders", icon: "📦" },
  { href: "/driver/earnings", label: "Earnings", icon: "💰" },
];

export function DriverNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 h-16">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={`flex flex-col items-center justify-center text-xs transition-colors ${
                isActive ? "text-green-600 font-medium" : "text-gray-600 hover:text-green-600"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <button
          title="Sign out of CodiDash"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex flex-col items-center justify-center text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          <span className="text-xl">🚪</span>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
