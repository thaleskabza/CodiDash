import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function SplashPage() {
  const session = await auth();

  // Redirect authenticated users to their dashboard
  if (session?.user) {
    if (session.user.role === "admin") redirect("/admin");
    if (session.user.role === "driver") redirect("/driver");
    redirect("/order"); // customer dashboard
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-5xl mx-auto w-full">
        <span className="text-2xl font-bold text-green-600">CodiDash</span>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-green-700 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16">
        <div className="max-w-2xl">
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Voucher delivery,{" "}
            <span className="text-green-600">made simple.</span>
          </h1>
          <p className="text-lg text-gray-500 mb-10">
            Redeem your Kauai vouchers and get your smoothie delivered straight
            to your door — fast, easy, and tracked in real time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 text-base font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors shadow-md"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 text-base font-semibold text-green-700 bg-white border border-green-300 rounded-xl hover:bg-green-50 transition-colors"
            >
              Sign in to your account
            </Link>
          </div>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap gap-3 justify-center text-sm text-gray-600">
          {["🛵 Real-time driver tracking", "📱 QR voucher scanning", "💳 Secure PayFast payments", "📍 Cape Town delivery"].map(
            (f) => (
              <span key={f} className="px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
                {f}
              </span>
            ),
          )}
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} CodiDash · Cape Town, South Africa
      </footer>
    </div>
  );
}
