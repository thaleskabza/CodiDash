import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { FraudAlerts } from "@/components/admin/FraudAlerts";

export default async function AdminFraudPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const [missingReceiptOrders, highCancellationDrivers] = await Promise.all([
    prisma.order.findMany({
      where: { status: "delivered", receiptImageUrl: null },
      include: {
        store: { select: { name: true } },
        driver: { include: { user: { select: { name: true } } } },
      },
      take: 50,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.driver.findMany({
      where: { cancellationCount: { gt: 3 } },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { cancellationCount: "desc" },
      take: 20,
    }),
  ]);

  const missingReceipt = missingReceiptOrders.map((o) => ({
    orderId: o.id,
    orderNumber: o.orderNumber,
    storeName: o.store.name,
    driverName: o.driver?.user.name ?? "Unknown",
    anomalyType: "missing_receipt" as const,
    createdAt: o.createdAt.toISOString(),
  }));

  const highCancellations = highCancellationDrivers.map((d) => ({
    driverId: d.id,
    name: d.user.name,
    email: d.user.email,
    cancellationCount: d.cancellationCount,
    anomalyType: "high_cancellations" as const,
  }));

  const totalAlerts = missingReceipt.length + highCancellations.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Fraud Detection</h1>
        {totalAlerts > 0 && (
          <span className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            {totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <Card className="p-4">
        <FraudAlerts
          missingReceipt={missingReceipt}
          qrAnomalies={[]}
          highCancellations={highCancellations}
        />
      </Card>
    </div>
  );
}
