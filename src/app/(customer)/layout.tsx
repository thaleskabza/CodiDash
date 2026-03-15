import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Public pages that don't need auth
  // Auth protection is also handled by middleware, but we keep this as a safety net
  const isPublicPage =
    typeof window !== "undefined" &&
    (window.location.pathname === "/login" ||
      window.location.pathname === "/register");

  if (!session?.user && !isPublicPage) {
    // Middleware handles most redirects; server component redirects for safety
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {session?.user && (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="font-bold text-green-600 text-lg">
              CodiDash
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm text-gray-600 hover:text-green-600 transition-colors"
              >
                Order
              </Link>
              <Link
                href="/orders"
                className="text-sm text-gray-600 hover:text-green-600 transition-colors"
              >
                My Orders
              </Link>
              <Link
                href="/profile"
                className="text-sm text-gray-600 hover:text-green-600 transition-colors"
              >
                Profile
              </Link>
              <span className="text-sm text-gray-400">
                {session.user.name?.split(" ")[0]}
              </span>
            </div>
          </div>
        </nav>
      )}
      <main>{children}</main>
    </div>
  );
}
