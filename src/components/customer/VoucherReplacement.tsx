"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface VoucherReplacementProps {
  orderId: string;
  item: {
    id: string;
    smoothieItem: string;
    voucherStatus: string;
    replacementDeadline: string | null;
  };
  onReplaced: (itemId: string, newCode: string | null) => void;
}

function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const s = Math.floor(ms / 1000);
  return s > 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
}

export function VoucherReplacement({ orderId, item, onReplaced }: VoucherReplacementProps) {
  const [countdown, setCountdown] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!item.replacementDeadline) return;
    const update = () => {
      const ms = msUntil(item.replacementDeadline!);
      setCountdown(formatCountdown(ms));
      setIsExpired(ms <= 0);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [item.replacementDeadline]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${item.id}/replace-voucher`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voucherCode: newCode.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 410) {
          setIsExpired(true);
          setError("Replacement window has expired. The item has been cancelled.");
        } else {
          setError(data.error || "Failed to submit replacement.");
        }
        return;
      }
      onReplaced(item.id, data.item.voucherCode);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (item.voucherStatus !== "invalid") return null;

  if (isExpired) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm font-medium text-red-700">
          Replacement window expired — item removed from order
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-3">
      <div>
        <p className="text-sm font-semibold text-orange-800">
          Driver reported invalid voucher for {item.smoothieItem}
        </p>
        {countdown && (
          <p className="text-sm text-orange-600 mt-0.5">
            Time remaining:{" "}
            <span className="font-bold tabular-nums">{countdown}</span>
          </p>
        )}
      </div>

      <p className="text-xs text-orange-700">
        Please provide a valid replacement voucher code, or leave blank if you have a photo
        voucher to show the driver.
      </p>

      {error && <Alert variant="error">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          placeholder="Enter replacement code (optional)"
          className="w-full border border-orange-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isSubmitting ? "Submitting…" : "Submit Replacement"}
        </Button>
      </form>
    </div>
  );
}
