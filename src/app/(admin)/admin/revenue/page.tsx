"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { RevenueChart } from "@/components/admin/RevenueChart";

const EMPTY_DATA = {
  totalAmountCharged: 0,
  totalDriverPayouts: 0,
  totalPlatformEarnings: 0,
  orderCount: 0,
  daily: [],
};

export default function AdminRevenuePage() {
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);

  const fetchRevenue = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      const res = await fetch(`/api/admin/revenue?${params}`);
      if (!res.ok) return;
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const to = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fetchRevenue(from, to);
  }, [fetchRevenue]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Revenue</h1>
      <Card className="p-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>
        ) : (
          <RevenueChart data={data} onDateRangeChange={fetchRevenue} />
        )}
      </Card>
    </div>
  );
}
