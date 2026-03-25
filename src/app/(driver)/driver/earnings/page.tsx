import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

const EARNING_STATUS_BADGE: Record<string, string> = {
  accrued: "bg-yellow-100 text-yellow-700",
  payable: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

function rands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export default async function DriverEarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/driver/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
  });
  if (!driver) redirect("/driver/login");

  const earnings = await prisma.driverEarning.findMany({
    where: { driverId: driver.id },
    include: {
      order: { include: { store: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalEarnedCents = earnings.reduce((sum, e) => sum + e.amount, 0);
  const todayEarnedCents = earnings
    .filter((e) => e.createdAt >= todayStart)
    .reduce((sum, e) => sum + e.amount, 0);

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
        {earnings.length === 0 ? (
          <p className="text-sm text-gray-500">No completed deliveries yet.</p>
        ) : (
          <ul className="space-y-3">
            {earnings.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-gray-700">{e.order.store.name}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(e.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <span
                    className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${
                      EARNING_STATUS_BADGE[e.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {e.status}
                  </span>
                </div>
                <span className="font-bold text-green-600">{rands(e.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
