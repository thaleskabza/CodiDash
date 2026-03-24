"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { DriverTable } from "@/components/admin/DriverTable";

const STATUS_OPTIONS = [
  { value: "", label: "All drivers" },
  { value: "pending_approval", label: "Pending Approval" },
  { value: "available", label: "Available" },
  { value: "busy", label: "Busy" },
  { value: "offline", label: "Offline" },
  { value: "suspended", label: "Suspended" },
];

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "50" });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/drivers?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setDrivers(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  async function handleStatusChange(
    driverId: string,
    newStatus: "available" | "suspended" | "offline",
  ) {
    const res = await fetch(`/api/admin/drivers/${driverId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) fetchDrivers();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Drivers</h1>
        <span className="text-sm text-gray-500">{total} total</span>
      </div>

      <Card className="p-4">
        <div className="flex gap-3 mb-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <DriverTable drivers={drivers} onStatusChange={handleStatusChange} />
        )}
      </Card>
    </div>
  );
}
