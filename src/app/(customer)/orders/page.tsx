import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  pending_driver: { label: "Finding Driver", color: "bg-yellow-100 text-yellow-700" },
  driver_assigned: { label: "Driver Assigned", color: "bg-blue-100 text-blue-700" },
  pickup_confirmed: { label: "At Store", color: "bg-blue-100 text-blue-700" },
  in_transit: { label: "On the Way", color: "bg-indigo-100 text-indigo-700" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600" },
  payment_pending: { label: "Payment Pending", color: "bg-orange-100 text-orange-700" },
};

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { status: statusFilter } = await searchParams;

  const orders = await prisma.order.findMany({
    where: {
      customerId: session.user.id,
      ...(statusFilter ? { status: statusFilter as never } : {}),
    },
    include: {
      store: { select: { name: true } },
      items: { select: { smoothieItem: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Link href="/" className="text-sm text-green-600 hover:underline">
          + New Order
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[
          { label: "All", value: "" },
          { label: "Active", value: "in_transit" },
          { label: "Delivered", value: "delivered" },
          { label: "Cancelled", value: "cancelled" },
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/orders?status=${f.value}` : "/orders"}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              (statusFilter ?? "") === f.value
                ? "bg-green-600 text-white border-green-600"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No orders yet.</p>
          <Link href="/" className="text-green-600 hover:underline text-sm mt-2 block">
            Place your first order →
          </Link>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const badge = STATUS_BADGES[order.status] ?? {
              label: order.status,
              color: "bg-gray-100 text-gray-600",
            };
            return (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{order.orderNumber}</p>
                        <p className="text-sm text-gray-500">{order.store.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {order.items.map((i) => i.smoothieItem).join(", ")}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <p className="text-sm font-medium text-gray-700 mt-1">
                          R{(order.deliveryFee / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
