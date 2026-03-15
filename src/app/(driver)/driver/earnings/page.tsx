import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

export default async function DriverEarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/driver/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
  });
  if (!driver) redirect("/driver/login");

  // Fetch completed deliveries with payments
  const completedOrders = await prisma.order.findMany({
    where: {
      driverId: driver.id,
      status: "delivered",
    },
    include: { payment: true, store: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const totalEarnedCents = completedOrders.reduce((sum, o) => {
    return sum + (o.payment?.driverAmount ?? 0);
  }, 0);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = completedOrders.filter((o) => o.updatedAt >= todayStart);
  const todayEarnedCents = todayOrders.reduce((sum, o) => {
    return sum + (o.payment?.driverAmount ?? 0);
  }, 0);

  function rands(cents: number) {
    return `R${(cents / 100).toFixed(2)}`;
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Earnings</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{rands(todayEarnedCents)}</p>
          <p className="text-xs text-gray-500 mt-1">Today</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{rands(totalEarnedCents)}</p>
          <p className="text-xs text-gray-500 mt-1">All Time</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="text-sm font-semibold mb-3 text-gray-700">Recent Deliveries</h2>
        {completedOrders.length === 0 ? (
          <p className="text-sm text-gray-500">No completed deliveries yet.</p>
        ) : (
          <ul className="space-y-3">
            {completedOrders.map((order) => (
              <li
                key={order.id}
                className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-gray-700">{order.store.name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.updatedAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <span className="font-bold text-green-600">
                  {order.payment ? rands(order.payment.driverAmount) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
