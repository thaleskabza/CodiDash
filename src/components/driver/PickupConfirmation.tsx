"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface PickupConfirmationProps {
  orderId: string;
  storeLatitude: number;
  storeLongitude: number;
  onConfirmed: () => void;
}

type GpsState = "idle" | "locating" | "ok" | "mismatch" | "error";

export function PickupConfirmation({
  orderId,
  storeLatitude,
  storeLongitude,
  onConfirmed,
}: PickupConfirmationProps) {
  const [gpsState, setGpsState] = useState<GpsState>("idle");
  const [driverCoords, setDriverCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setGpsState("locating");
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setDriverCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsState("ok");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setReceiptUrl(url);
    } catch {
      setError("Receipt upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleConfirm() {
    if (!receiptUrl || !driverCoords) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pickup_confirmed",
          receiptImageUrl: receiptUrl,
          driverLatitude: driverCoords.lat,
          driverLongitude: driverCoords.lng,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 422) {
          setGpsState("mismatch");
          setError("Your location doesn't match the store. Please move closer.");
        } else {
          setError(data.error || "Failed to confirm pickup.");
        }
        return;
      }
      onConfirmed();
    } finally {
      setIsSubmitting(false);
    }
  }

  const canConfirm = receiptUrl && driverCoords && gpsState === "ok" && !isSubmitting;

  return (
    <div className="space-y-4">
      {/* GPS status */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            gpsState === "ok" ? "bg-green-500" :
            gpsState === "mismatch" ? "bg-red-500" :
            gpsState === "locating" ? "bg-yellow-400 animate-pulse" :
            "bg-gray-300"
          }`}
        />
        <span className="text-gray-600">
          {gpsState === "ok" && "GPS location confirmed"}
          {gpsState === "locating" && "Getting your location…"}
          {gpsState === "mismatch" && "Location mismatch — move closer to store"}
          {gpsState === "error" && "GPS unavailable"}
          {gpsState === "idle" && "Waiting for GPS…"}
        </span>
      </div>

      {/* Receipt upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Receipt Photo *
        </label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleReceiptUpload}
          disabled={isUploading || isSubmitting}
          className="text-sm"
        />
        {isUploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        {receiptUrl && !isUploading && (
          <p className="text-xs text-green-600 mt-1">✓ Receipt uploaded</p>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Button
        className="w-full"
        disabled={!canConfirm}
        onClick={handleConfirm}
      >
        {isSubmitting ? "Confirming…" : "Confirm Pickup"}
      </Button>
    </div>
  );
}
