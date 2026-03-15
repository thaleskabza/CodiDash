import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [activeOrders, onlineDrivers, todayRevenue, fraudCount] = await Promise.all([
    prisma.order.count({
      where: { status: { in: ["accepted", "pickup_confirmed", "in_transit"] } },
    }),
    prisma.driver.count({ where: { status: { in: ["available", "busy"] } } }),
    prisma.payment.aggregate({
      where: { status: "completed", createdAt: { gte: todayStart } },
      _sum: { platformAmount: true },
    }),
    prisma.order.count({ where: { status: "delivered", receiptImageUrl: null } }),
  ]);

  const todayEarnings = todayRevenue._sum.platformAmount ?? 0;

  const overviewCards = [
    { label: "Active Orders", value: String(activeOrders), href: "/admin/orders", color: "text-blue-600" },
    { label: "Online Drivers", value: String(onlineDrivers), href: "/admin/drivers", color: "text-green-600" },
    { label: "Today's Earnings", value: `R${(todayEarnings / 100).toFixed(2)}`, href: "/admin/revenue", color: "text-indigo-600" },
    { label: "Fraud Alerts", value: String(fraudCount), href: "/admin/fraud", color: fraudCount > 0 ? "text-red-600" : "text-gray-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="p-4 hover:shadow-md transition-shadow">
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-sm text-gray-500 mt-1">{card.label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/admin/drivers?status=pending_approval" className="block text-sm text-green-600 hover:underline">
              Review pending driver approvals
            </Link>
            <Link href="/admin/fraud" className="block text-sm text-orange-600 hover:underline">
              View fraud alerts
            </Link>
            <Link href="/admin/orders?status=payment_pending" className="block text-sm text-yellow-600 hover:underline">
              Orders with payment issues
            </Link>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Platform Status</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Active deliveries</span>
              <span className="font-medium">{activeOrders}</span>
            </div>
            <div className="flex justify-between">
              <span>Available drivers</span>
              <span className="font-medium">{onlineDrivers}</span>
            </div>
            <div className="flex justify-between">
              <span>Platform earnings today</span>
              <span className="font-medium text-indigo-600">R{(todayEarnings / 100).toFixed(2)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
