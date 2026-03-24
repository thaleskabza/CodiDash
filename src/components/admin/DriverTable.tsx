"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface DriverRow {
  id: string;
  name: string;
  email: string;
  status: string;
  rating: number;
  cancellationCount: number;
  deliveryCount: number;
  joinedAt: string;
}

interface DriverTableProps {
  drivers: DriverRow[];
  onStatusChange: (driverId: string, newStatus: "available" | "suspended" | "offline") => Promise<void>;
}

const STATUS_COLORS: Record<string, string> = {
  pending_approval: "bg-yellow-100 text-yellow-800",
  available: "bg-green-100 text-green-700",
  busy: "bg-orange-100 text-orange-700",
  offline: "bg-gray-100 text-gray-500",
  suspended: "bg-red-100 text-red-700",
};

export function DriverTable({ drivers, onStatusChange }: DriverTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleAction(driverId: string, newStatus: "available" | "suspended") {
    setLoadingId(driverId);
    try {
      await onStatusChange(driverId, newStatus);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-2 pr-4 font-medium text-gray-600">Name</th>
            <th className="py-2 pr-4 font-medium text-gray-600">Status</th>
            <th className="py-2 pr-4 font-medium text-gray-600 text-center">Rating</th>
            <th className="py-2 pr-4 font-medium text-gray-600 text-center">Cancellations</th>
            <th className="py-2 pr-4 font-medium text-gray-600 text-center">Deliveries</th>
            <th className="py-2 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-b border-gray-100 last:border-0">
              <td className="py-2.5 pr-4">
                <p className="font-medium text-gray-700">{driver.name}</p>
                <p className="text-xs text-gray-400">{driver.email}</p>
              </td>
              <td className="py-2.5 pr-4">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    STATUS_COLORS[driver.status] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {driver.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-center text-gray-700">
                {driver.rating.toFixed(1)}
              </td>
              <td className="py-2.5 pr-4 text-center">
                <span
                  className={driver.cancellationCount > 3 ? "text-red-600 font-bold" : "text-gray-600"}
                >
                  {driver.cancellationCount}
                </span>
              </td>
              <td className="py-2.5 pr-4 text-center text-gray-600">{driver.deliveryCount}</td>
              <td className="py-2.5">
                <div className="flex gap-2">
                  {driver.status === "pending_approval" && (
                    <Button
                      size="sm"
                      onClick={() => handleAction(driver.id, "available")}
                      disabled={loadingId === driver.id}
                    >
                      {loadingId === driver.id ? "…" : "Approve"}
                    </Button>
                  )}
                  {driver.status !== "suspended" && driver.status !== "pending_approval" && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleAction(driver.id, "suspended")}
                      disabled={loadingId === driver.id}
                    >
                      {loadingId === driver.id ? "…" : "Suspend"}
                    </Button>
                  )}
                  {driver.status === "suspended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(driver.id, "available")}
                      disabled={loadingId === driver.id}
                    >
                      {loadingId === driver.id ? "…" : "Reinstate"}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {drivers.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400 text-sm">
                No drivers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
