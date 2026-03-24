"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

interface NavBarProps {
  userName: string;
}

export function NavBar({ userName }: NavBarProps) {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-green-600 text-lg">
          CodiDash
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/order" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
            Order
          </Link>
          <Link href="/orders" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
            My Orders
          </Link>
          <Link href="/profile" className="text-sm text-gray-600 hover:text-green-600 transition-colors">
            Profile
          </Link>
          <span className="text-sm text-gray-400">{userName}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
