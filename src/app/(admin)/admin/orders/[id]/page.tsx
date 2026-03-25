import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

type Params = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<string, string> = {
  pending_driver: "Pending Driver",
  driver_assigned: "Driver Assigned",
  pickup_confirmed: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_pending: "Payment Pending",
};

const STATUS_COLORS: Record<string, string> = {
  pending_driver: "bg-yellow-100 text-yellow-800",
  driver_assigned: "bg-blue-100 text-blue-800",
  pickup_confirmed: "bg-indigo-100 text-indigo-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-700",
  payment_pending: "bg-orange-100 text-orange-800",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  authorized: "bg-blue-100 text-blue-800",
  captured: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-gray-100 text-gray-600",
};

function rands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export default async function AdminOrderDetailPage({ params }: Params) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect("/");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      store: true,
      deliveryAddress: true,
      customer: { select: { name: true, email: true } },
      driver: { include: { user: { select: { name: true, email: true } } } },
      items: true,
      payment: true,
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) notFound();

  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusColor = STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back + header */}
      <div>
        <Link
          href="/admin/orders"
          className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block"
        >
          ← Back to Orders
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">
            Order {order.orderNumber}
          </h1>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor}`}>
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {new Date(order.createdAt).toLocaleString("en-ZA", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer */}
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Customer</h2>
          <p className="text-sm font-medium">{order.customer.name}</p>
          <p className="text-xs text-gray-500">{order.customer.email}</p>
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Delivery address:</span>{" "}
            {order.deliveryAddress.address}
          </p>
        </Card>

        {/* Store */}
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Store</h2>
          <p className="text-sm font-medium">{order.store.name}</p>
          <p className="text-xs text-gray-500">{order.store.address}</p>
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">Distance:</span>{" "}
            {Number(order.distanceKm).toFixed(1)} km
          </p>
        </Card>

        {/* Driver */}
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Driver</h2>
          {order.driver ? (
            <>
              <p className="text-sm font-medium">{order.driver.user.name}</p>
              <p className="text-xs text-gray-500">{order.driver.user.email}</p>
              <p className="text-xs text-gray-500 mt-1">
                <span className="font-medium">Vehicle:</span> {order.driver.vehicleType}
              </p>
              <p className="text-xs text-gray-500">
                <span className="font-medium">Status:</span> {order.driver.status}
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 italic">Not yet assigned</p>
          )}
        </Card>

        {/* Payment */}
        <Card className="p-4 space-y-1">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Payment</h2>
          <p className="text-sm">
            <span className="font-medium">Delivery fee:</span>{" "}
            {rands(order.deliveryFee)}
          </p>
          {order.payment ? (
            <>
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                  PAYMENT_STATUS_COLORS[order.payment.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {order.payment.status}
              </span>
              {order.payment.status === "captured" && (
                <div className="text-xs text-gray-500 space-y-0.5 mt-2">
                  <p>Driver payout: {rands(order.payment.driverAmount)}</p>
                  <p>Platform cut: {rands(order.payment.platformAmount)}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">No payment record yet</p>
          )}
          {order.paymentToken && (
            <p className="text-xs text-gray-400 mt-1">Token on file ✓</p>
          )}
        </Card>
      </div>

      {/* Items */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Order Items ({order.items.length})
        </h2>
        <ul className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <li key={item.id} className="py-2 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{item.smoothieItem}</p>
                {item.voucherCode && (
                  <p className="text-xs text-gray-500 font-mono">
                    Voucher: {item.voucherCode}
                  </p>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  item.voucherStatus === "valid"
                    ? "bg-green-100 text-green-700"
                    : item.voucherStatus === "invalid"
                    ? "bg-red-100 text-red-700"
                    : item.voucherStatus === "replaced"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {item.voucherStatus}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Audit trail */}
      <Card className="p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Audit Trail</h2>
        {order.auditLogs.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No audit events yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-4 ml-3">
            {order.auditLogs.map((log) => (
              <li key={log.id} className="ml-4">
                <span className="absolute -left-1.5 mt-1 w-3 h-3 rounded-full bg-green-400 border-2 border-white" />
                <p className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString("en-ZA", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                  {" · "}
                  <span className="capitalize">{log.actorType}</span>
                </p>
                <p className="text-sm text-gray-700">
                  {log.previousStatus
                    ? `${STATUS_LABELS[log.previousStatus] ?? log.previousStatus} → ${STATUS_LABELS[log.newStatus] ?? log.newStatus}`
                    : STATUS_LABELS[log.newStatus] ?? log.newStatus}
                </p>
                {log.metadata && typeof log.metadata === "object" && Object.keys(log.metadata as object).length > 0 && (
                  <p className="text-xs text-gray-400 font-mono mt-0.5 break-all">
                    {JSON.stringify(log.metadata)}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
