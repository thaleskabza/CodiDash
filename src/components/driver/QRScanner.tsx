"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface QRScannerProps {
  orderId: string;
  onDelivered: (result: { amountCharged: number }) => void;
}

export function QRScanner({ orderId, onDelivered }: QRScannerProps) {
  const [mode, setMode] = useState<"idle" | "manual">("idle");
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "manual") inputRef.current?.focus();
  }, [mode]);

  async function submitQrData(qrDataStr: string) {
    setError("");
    setIsSubmitting(true);
    try {
      const qrData = JSON.parse(qrDataStr);
      const res = await fetch(`/api/orders/${orderId}/complete-delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrData }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "QR scan failed. Please try again.");
        return;
      }
      onDelivered({ amountCharged: data.amountCharged });
    } catch {
      setError("Invalid QR code. Please ask the customer to show their QR code again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Ask the customer to show their delivery QR code, then scan or enter it manually.
      </p>

      {/* Manual entry fallback */}
      {mode === "manual" ? (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Enter QR code data manually
          </label>
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Paste QR code data…"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => submitQrData(manualInput)}
              disabled={!manualInput.trim() || isSubmitting}
            >
              {isSubmitting ? "Processing…" : "Submit"}
            </Button>
            <Button variant="outline" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
            <p className="text-4xl mb-2">📷</p>
            <p className="text-sm text-gray-500">
              Camera-based scanning coming soon
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setMode("manual")}
          >
            Enter Code Manually
          </Button>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
