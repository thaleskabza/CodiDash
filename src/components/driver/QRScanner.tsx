"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface QRScannerProps {
  orderId: string;
  onDelivered: (result: { amountCharged: number }) => void;
}

export function QRScanner({ orderId, onDelivered }: QRScannerProps) {
  const [mode, setMode] = useState<"idle" | "camera" | "manual" | "success">("idle");
  const [manualInput, setManualInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [amountCharged, setAmountCharged] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const scannedRef = useRef(false);
  // Keep onDelivered fresh so the stale closure in tick() always calls the latest version
  const onDeliveredRef = useRef(onDelivered);
  useEffect(() => { onDeliveredRef.current = onDelivered; }, [onDelivered]);

  useEffect(() => {
    if (mode === "manual") inputRef.current?.focus();
  }, [mode]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Auto-redirect after success screen
  useEffect(() => {
    if (mode !== "success") return;
    const timer = setTimeout(() => {
      window.location.href = "/driver";
    }, 3000);
    return () => clearTimeout(timer);
  }, [mode]);

  // Start/stop camera when mode switches
  useEffect(() => {
    if (mode !== "camera") {
      stopCamera();
      return;
    }

    scannedRef.current = false;
    setCameraError("");

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch {
        setCameraError("Could not access camera. Check browser permissions.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || scannedRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code?.data) {
            scannedRef.current = true;
            stopCamera();
            submitQrData(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }

    startCamera();
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, stopCamera]);

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
        setMode("idle");
        return;
      }
      // Notify parent (best-effort via ref — always fresh)
      onDeliveredRef.current({ amountCharged: data.amountCharged });
      setAmountCharged(data.amountCharged ?? null);
      setMode("success");
    } catch {
      setError("Invalid QR code. Please ask the customer to show their QR code again.");
      setMode("idle");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (mode === "success") {
    const rands = amountCharged != null ? (amountCharged / 100).toFixed(2) : null;
    return (
      <div className="text-center space-y-3 py-4">
        <div className="text-4xl">🎉</div>
        <p className="font-semibold text-green-700">Delivery Complete!</p>
        {rands && (
          <p className="text-sm text-gray-600">
            Payout: <span className="font-bold text-green-700">R{rands}</span>
          </p>
        )}
        <p className="text-xs text-gray-400">Redirecting to dashboard…</p>
      </div>
    );
  }

  // ── Camera screen ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Ask the customer to show their delivery QR code, then scan or enter it manually.
      </p>

      {mode === "camera" && (
        <div className="space-y-3">
          {cameraError ? (
            <Alert variant="error">{cameraError}</Alert>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} className="w-full" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              {isSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <p className="text-white text-sm font-medium">Processing…</p>
                </div>
              )}
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={() => setMode("idle")}>
            Cancel Scan
          </Button>
        </div>
      )}

      {mode === "manual" && (
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
      )}

      {mode === "idle" && (
        <div className="space-y-3">
          <Button className="w-full" onClick={() => setMode("camera")}>
            📷 Scan QR Code
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setMode("manual")}>
            Enter Code Manually
          </Button>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}
    </div>
  );
}
