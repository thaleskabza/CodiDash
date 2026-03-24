import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main>{children}</main>

      {session?.user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="grid grid-cols-4 h-16">
            <Link
              href="/driver"
              className="flex flex-col items-center justify-center text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl">🏠</span>
              Dashboard
            </Link>
            <Link
              href="/driver/orders"
              className="flex flex-col items-center justify-center text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl">📦</span>
              Active Order
            </Link>
            <Link
              href="/driver/earnings"
              className="flex flex-col items-center justify-center text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl">💰</span>
              Earnings
            </Link>
            <Link
              href="/driver/profile"
              className="flex flex-col items-center justify-center text-xs text-gray-600 hover:text-green-600 transition-colors"
            >
              <span className="text-xl">👤</span>
              Profile
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
