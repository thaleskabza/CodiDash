import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

const ACTIVE_STATUSES = ["driver_assigned", "pickup_confirmed", "in_transit"] as const;
const PAST_STATUSES   = ["delivered", "cancelled"] as const;

const STATUS_LABEL: Record<string, string> = {
  driver_assigned:  "Heading to store",
  pickup_confirmed: "Order picked up",
  in_transit:       "In transit",
  delivered:        "Delivered",
  cancelled:        "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  driver_assigned:  "bg-yellow-100 text-yellow-700",
  pickup_confirmed: "bg-blue-100 text-blue-700",
  in_transit:       "bg-orange-100 text-orange-700",
  delivered:        "bg-green-100 text-green-700",
  cancelled:        "bg-gray-100 text-gray-500",
};

export default async function DriverOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect("/driver/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
  });
  if (!driver) redirect("/driver/login");

  const [activeOrders, pastOrders] = await Promise.all([
    prisma.order.findMany({
      where: { driverId: driver.id, status: { in: [...ACTIVE_STATUSES] } },
      include: { store: true, deliveryAddress: true, items: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.order.findMany({
      where: { driverId: driver.id, status: { in: [...PAST_STATUSES] } },
      include: { store: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const hasAnyOrders = activeOrders.length > 0 || pastOrders.length > 0;

  // ── No orders ever dispatched ──────────────────────────────────────────────
  if (!hasAnyOrders) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 flex flex-col items-center text-center space-y-4">
        <span className="text-6xl">🛵</span>
        <h1 className="text-2xl font-bold text-gray-800">No orders yet</h1>
        <p className="text-gray-500 text-sm max-w-xs">
          Orders nearby will appear on your dashboard once customers place them.
          Make sure your location is enabled so you receive notifications.
        </p>
        <Link
          href="/driver"
          className="mt-4 px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>

      {/* ── Active orders ──────────────────────────────────────────────── */}
      {activeOrders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Active
          </h2>
          {activeOrders.map((order) => (
            <Card key={order.id} className="p-4 border-l-4 border-l-green-500">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="font-semibold text-gray-800">{order.store.name}</p>
                  <p className="text-xs text-gray-500">{order.deliveryAddress.address}</p>
                  <p className="text-xs text-gray-400">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""} ·{" "}
                    R{((order.deliveryFee ?? 0) / 100).toFixed(2)} delivery fee
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
                    STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <Link
                href={`/driver/orders/${order.id}`}
                className="mt-3 block w-full text-center py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue delivery →
              </Link>
            </Card>
          ))}
        </section>
      )}

      {/* ── Past orders ────────────────────────────────────────────────── */}
      {pastOrders.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            History
          </h2>
          <Card className="p-0 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {pastOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-700">{order.store.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.updatedAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      STATUS_COLOR[order.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Active but no history (or vice-versa) padding ──────────────── */}
      {activeOrders.length === 0 && pastOrders.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          No active deliveries right now. Check your{" "}
          <Link href="/driver" className="text-green-600 underline">
            dashboard
          </Link>{" "}
          for new orders.
        </p>
      )}
    </div>
  );
}
