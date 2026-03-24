"use client";

import { useState } from "react";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  storeName: string;
  driverName: string | null;
  itemCount: number;
  deliveryFee: number;
  paymentStatus: string | null;
  createdAt: string;
}

interface OrderTableProps {
  orders: OrderRow[];
  onRowClick?: (orderId: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  accepted: "bg-blue-100 text-blue-700",
  pickup_confirmed: "bg-indigo-100 text-indigo-700",
  in_transit: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
  payment_pending: "bg-orange-100 text-orange-700",
};

type SortKey = "createdAt" | "status" | "storeName";

export function OrderTable({ orders, onRowClick }: OrderTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...orders].sort((a, b) => {
    const va = a[sortKey] ?? "";
    const vb = b[sortKey] ?? "";
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-1">⇅</span>;
    return <span className="text-gray-600 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th
              className="py-2 pr-4 font-medium text-gray-600 cursor-pointer whitespace-nowrap"
              onClick={() => handleSort("createdAt")}
            >
              Date <SortIcon k="createdAt" />
            </th>
            <th className="py-2 pr-4 font-medium text-gray-600 whitespace-nowrap">Order #</th>
            <th
              className="py-2 pr-4 font-medium text-gray-600 cursor-pointer whitespace-nowrap"
              onClick={() => handleSort("storeName")}
            >
              Store <SortIcon k="storeName" />
            </th>
            <th className="py-2 pr-4 font-medium text-gray-600 whitespace-nowrap">Driver</th>
            <th
              className="py-2 pr-4 font-medium text-gray-600 cursor-pointer whitespace-nowrap"
              onClick={() => handleSort("status")}
            >
              Status <SortIcon k="status" />
            </th>
            <th className="py-2 font-medium text-gray-600 text-right whitespace-nowrap">Fee</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((order) => (
            <tr
              key={order.id}
              onClick={() => onRowClick?.(order.id)}
              className={`border-b border-gray-100 last:border-0 ${
                onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
              }`}
            >
              <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">
                {new Date(order.createdAt).toLocaleDateString("en-ZA", {
                  day: "numeric",
                  month: "short",
                })}
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs text-gray-700">
                #{order.orderNumber}
              </td>
              <td className="py-2.5 pr-4 text-gray-700">{order.storeName}</td>
              <td className="py-2.5 pr-4 text-gray-500">{order.driverName ?? "—"}</td>
              <td className="py-2.5 pr-4">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {order.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="py-2.5 text-right font-medium text-gray-700">
                R{(order.deliveryFee / 100).toFixed(2)}
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
