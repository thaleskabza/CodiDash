"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface VoucherInvalidReportProps {
  orderId: string;
  item: {
    id: string;
    smoothieItem: string;
    voucherCode: string | null;
    voucherStatus: string;
    replacementDeadline?: string | null;
  };
  onStatusChange: (itemId: string, status: string, deadline?: string) => void;
}

function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  return s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function VoucherInvalidReport({ orderId, item, onStatusChange }: VoucherInvalidReportProps) {
  const [isReporting, setIsReporting] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item.replacementDeadline) return;
    const timer = setInterval(() => {
      setCountdown(formatCountdown(msUntil(item.replacementDeadline!)));
    }, 1000);
    setCountdown(formatCountdown(msUntil(item.replacementDeadline)));
    return () => clearInterval(timer);
  }, [item.replacementDeadline]);

  async function reportInvalid() {
    setIsReporting(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}/voucher-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherStatus: "invalid" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to report voucher.");
        return;
      }
      onStatusChange(item.id, "invalid", data.item.replacementDeadline);
    } finally {
      setIsReporting(false);
    }
  }

  if (item.voucherStatus === "invalid") {
    return (
      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <p className="text-sm font-medium text-orange-800">
          ⚠ Voucher invalid — waiting for customer replacement
        </p>
        {item.replacementDeadline && countdown && (
          <p className="text-sm text-orange-600 mt-1">
            Customer has: <span className="font-bold">{countdown}</span> remaining
          </p>
        )}
        <p className="text-xs text-orange-500 mt-1">
          The customer has been notified and has 5 minutes to provide a replacement.
        </p>
      </div>
    );
  }

  if (item.voucherStatus === "replaced") {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm font-medium text-green-800">✓ Replacement voucher received</p>
        <p className="text-xs text-green-600 mt-0.5">
          {item.voucherCode ? `New code: ${item.voucherCode}` : "Image voucher updated"}
        </p>
      </div>
    );
  }

  if (item.voucherStatus === "cancelled") {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-700">✗ Voucher cancelled — item removed from order</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div>
        <p className="text-sm font-medium">{item.smoothieItem}</p>
        {item.voucherCode && (
          <p className="text-xs text-gray-500">Code: {item.voucherCode}</p>
        )}
      </div>
      <Button
        size="sm"
        variant="danger"
        onClick={reportInvalid}
        disabled={isReporting}
      >
        {isReporting ? "Reporting…" : "Mark Invalid"}
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
