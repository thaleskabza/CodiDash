import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";

const STATUS_BADGE: Record<string, string> = {
  accrued: "bg-yellow-100 text-yellow-700",
  payable: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
};

export default async function AdminEarningsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const [earnings, totals] = await Promise.all([
    prisma.driverEarning.findMany({
      include: {
        driver: { include: { user: { select: { name: true } } } },
        order: { select: { orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.driverEarning.groupBy({
      by: ["status"],
      orderBy: { status: "asc" },
      _sum: { amount: true },
    }),
  ]);

  const summaryMap: Record<string, number> = {};
  for (const row of totals) {
    summaryMap[row.status] = row._sum?.amount ?? 0;
  }

  const summaryCards = [
    { label: "Accrued", amount: summaryMap["accrued"] ?? 0, color: "text-yellow-600" },
    { label: "Payable", amount: summaryMap["payable"] ?? 0, color: "text-blue-600" },
    { label: "Paid", amount: summaryMap["paid"] ?? 0, color: "text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Driver Earnings</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {summaryCards.map((c) => (
          <Card key={c.label} className="p-4">
            <p className={`text-2xl font-bold ${c.color}`}>R{(c.amount / 100).toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </Card>
        ))}
      </div>

      {/* Earnings table */}
      <Card className="p-4">
        {earnings.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">No earnings recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4 font-medium">Driver</th>
                  <th className="pb-2 pr-4 font-medium">Order</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {earnings.map((e) => (
                  <tr key={e.id} className="py-2">
                    <td className="py-2 pr-4 text-gray-800">{e.driver.user.name}</td>
                    <td className="py-2 pr-4 text-gray-600 font-mono text-xs">{e.order.orderNumber}</td>
                    <td className="py-2 pr-4 font-medium text-gray-800">R{(e.amount / 100).toFixed(2)}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[e.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-400 text-xs">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
