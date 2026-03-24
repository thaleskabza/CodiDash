import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { DriverDashboardClient } from "@/components/driver/DriverDashboardClient";

const STATUS_LABELS: Record<string, string> = {
  pending_approval: "Pending Approval",
  available: "Available",
  busy: "On Delivery",
  offline: "Offline",
  suspended: "Suspended",
};

const STATUS_COLORS: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  available: "bg-green-100 text-green-800",
  busy: "bg-orange-100 text-orange-800",
  offline: "bg-gray-100 text-gray-600",
  suspended: "bg-red-100 text-red-700",
};

export default async function DriverDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/driver/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true } } },
  });

  if (!driver) redirect("/driver/login");

  const statusLabel = STATUS_LABELS[driver.status] ?? driver.status;
  const statusColor = STATUS_COLORS[driver.status] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/images/driver-avatar.png"
            alt="Driver avatar"
            width={48}
            height={48}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold">
            Hello, {driver.user.name.split(" ")[0]}
          </h1>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {driver.status === "pending_approval" && (
        <Alert variant="warning">
          Your account is pending admin approval. You&apos;ll be notified when you can start
          accepting orders.
        </Alert>
      )}

      {driver.status === "suspended" && (
        <Alert variant="error">
          Your account has been suspended. Please contact support for assistance.
        </Alert>
      )}

      {(driver.status === "available" || driver.status === "offline") && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Available Orders</h2>
          <DriverDashboardClient driverId={driver.id} />
        </Card>
      )}

      {driver.status === "busy" && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Active Order</h2>
          <p className="text-gray-500 text-sm mb-3">
            You have an active order in progress.
          </p>
          <Link
            href="/driver/orders/active"
            className="text-sm font-medium text-green-600 underline"
          >
            View active order
          </Link>
        </Card>
      )}

      <Card className="p-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-green-600">
            {Number(driver.rating).toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rating</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-800">
            {driver.cancellationCount}
          </p>
          <p className="text-xs text-gray-500 mt-1">Cancellations</p>
        </div>
      </Card>
    </div>
  );
}
