"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface DailyRevenue {
  date: string;
  count: number;
  total: number;
}

interface RevenueSummary {
  totalAmountCharged: number;
  totalDriverPayouts: number;
  totalPlatformEarnings: number;
  orderCount: number;
  daily: DailyRevenue[];
}

interface RevenueChartProps {
  data: RevenueSummary;
  onDateRangeChange: (from: string, to: string) => void;
}

function rands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export function RevenueChart({ data, onDateRangeChange }: RevenueChartProps) {
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  function handleApply() {
    onDateRangeChange(from, to);
  }

  const maxTotal = Math.max(...data.daily.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Date range selector */}
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          onClick={handleApply}
          className="px-4 py-1.5 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
        >
          Apply
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-gray-800">{rands(data.totalAmountCharged)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Revenue</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-green-600">{rands(data.totalDriverPayouts)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Driver Payouts</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{rands(data.totalPlatformEarnings)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Platform Earnings</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-lg font-bold text-gray-800">{data.orderCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Orders</p>
        </Card>
      </div>

      {/* Bar chart (CSS-based) */}
      {data.daily.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Daily Revenue</p>
          <div className="flex items-end gap-1 h-24 overflow-x-auto">
            {data.daily.map((day) => (
              <div key={day.date} className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 20 }}>
                <div
                  title={`${day.date}: ${rands(day.total)} (${day.count} orders)`}
                  className="w-4 bg-green-400 rounded-t cursor-pointer hover:bg-green-500 transition-colors"
                  style={{ height: `${Math.max(4, (day.total / maxTotal) * 80)}px` }}
                />
                <span className="text-gray-300 text-[9px] mt-0.5 rotate-90 origin-center whitespace-nowrap">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
