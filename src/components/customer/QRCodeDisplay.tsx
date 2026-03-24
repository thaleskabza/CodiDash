"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface QRCodeDisplayProps {
  orderId: string;
  initialQrPayload: string;
  initialExpiresAt: string;
}

function msUntil(isoDate: string): number {
  return new Date(isoDate).getTime() - Date.now();
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function QRCodeDisplay({
  orderId,
  initialQrPayload,
  initialExpiresAt,
}: QRCodeDisplayProps) {
  const [qrPayload, setQrPayload] = useState(initialQrPayload);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [countdown, setCountdown] = useState(formatCountdown(msUntil(initialExpiresAt)));
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(msUntil(expiresAt)));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  async function regenerate() {
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/qr`);
      if (res.ok) {
        const data = await res.json();
        setQrPayload(data.qrPayload);
        setExpiresAt(data.expiresAt);
      }
    } finally {
      setIsRegenerating(false);
    }
  }

  const expired = msUntil(expiresAt) <= 0;

  return (
    <div className="text-center space-y-3">
      <p className="text-sm font-medium text-gray-700">
        Show this QR code to your driver at delivery
      </p>

      <div className={`inline-block p-2 border-2 rounded-lg ${expired ? "opacity-40 border-red-300" : "border-green-400"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrPayload}
          alt="Delivery QR Code"
          width={200}
          height={200}
          className="block"
        />
      </div>

      <div className="text-sm">
        {expired ? (
          <span className="text-red-500 font-medium">QR code expired</span>
        ) : (
          <span className="text-gray-500">
            Valid for <span className="font-medium text-gray-700">{countdown}</span>
          </span>
        )}
      </div>

      {expired && (
        <Button size="sm" onClick={regenerate} disabled={isRegenerating}>
          {isRegenerating ? "Regenerating…" : "Get New QR Code"}
        </Button>
      )}
    </div>
  );
}
