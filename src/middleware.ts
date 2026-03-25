import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Route prefix to required role mapping.
// Note: /api/orders is intentionally NOT listed here — multiple roles
// (customer, driver) access different sub-routes, so auth is handled
// inside each route handler rather than at the middleware level.
const ROLE_PROTECTED_ROUTES: Record<string, string> = {
  "/customer": "customer",
  "/driver": "driver",
  "/admin": "admin",
  "/api/drivers/me": "driver",
  "/api/admin": "admin",
};

// Routes that require authentication but no specific role
const AUTH_REQUIRED_ROUTES = ["/api/uploads", "/api/addresses", "/api/payments/cards"];

// Login pages must remain publicly accessible (reached after sign-out)
const PUBLIC_PATHS = ["/login", "/register", "/driver/login", "/driver/register"];

export default auth(function middleware(req: NextRequest & { auth: any }) {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Allow public paths through without auth checks
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // Check role-protected routes
  for (const [prefix, requiredRole] of Object.entries(ROLE_PROTECTED_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!session?.user) {
        // Not authenticated — redirect to login
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (session.user.role !== requiredRole) {
        // Wrong role — 403 for API routes, redirect for UI routes
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { error: "Forbidden", message: "Insufficient permissions" },
            { status: 403 },
          );
        }
        // Redirect to their own dashboard
        const dashboardUrl = new URL(`/${session.user.role}`, req.url);
        return NextResponse.redirect(dashboardUrl);
      }

      break;
    }
  }

  // Check auth-required routes (any authenticated user)
  for (const prefix of AUTH_REQUIRED_ROUTES) {
    if (pathname.startsWith(prefix)) {
      if (!session?.user) {
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 },
        );
      }
      break;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - public assets
     * - auth API routes (handled by NextAuth itself — must not be intercepted)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
