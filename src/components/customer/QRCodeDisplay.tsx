"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/Button";

interface QRCodeDisplayProps {
  orderId: string;
  initialQrPayload: string;   // the signed JSON string stored in DB
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

async function payloadToDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    type: "image/png",
    margin: 2,
    width: 260,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
}

export function QRCodeDisplay({
  orderId,
  initialQrPayload,
  initialExpiresAt,
}: QRCodeDisplayProps) {
  const [qrPayload, setQrPayload] = useState(initialQrPayload);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [countdown, setCountdown] = useState(formatCountdown(msUntil(initialExpiresAt)));
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Generate PNG whenever the payload changes
  useEffect(() => {
    payloadToDataUrl(qrPayload).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [qrPayload]);

  // Countdown ticker
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
        // API returns the signed payload as qrData (object) — stringify it for display
        const newPayload = typeof data.qrData === "string"
          ? data.qrData
          : JSON.stringify(data.qrData);
        setQrPayload(newPayload);
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
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Delivery QR Code" width={260} height={260} className="block" />
        ) : (
          <div className="w-[260px] h-[260px] flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
            Loading QR…
          </div>
        )}
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
