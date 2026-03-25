"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { PickupConfirmation } from "@/components/driver/PickupConfirmation";
import { QRScanner } from "@/components/driver/QRScanner";
import { VoucherInvalidReport } from "@/components/driver/VoucherInvalidReport";
import { subscribeToVoucherEvents } from "@/lib/realtime";

interface OrderItem {
  id: string;
  smoothieItem: string;
  voucherCode: string | null;
  voucherStatus: string;
  replacementDeadline: string | null;
}

interface OrderData {
  id: string;
  status: string;
  storeLatitude: number;
  storeLongitude: number;
  storeName: string;
  storeAddress: string;
  deliveryAddress: string;
  items: OrderItem[];
}

interface ActiveOrderClientProps {
  orderId: string;
  order: OrderData;
}

const STATUS_STEPS = [
  { key: "driver_assigned", label: "Accepted" },
  { key: "pickup_confirmed", label: "Picked Up" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

export function ActiveOrderClient({ orderId, order: initialOrder }: ActiveOrderClientProps) {
  const [status, setStatus] = useState(initialOrder.status);
  const [items, setItems] = useState<OrderItem[]>(initialOrder.items);
  const [deliveredAmount, setDeliveredAmount] = useState<number | null>(null);

  useEffect(() => {
    const unsub = subscribeToVoucherEvents(orderId, (event) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === event.itemId
            ? {
                ...item,
                voucherStatus: event.type === "expired" ? "cancelled" : event.type,
                replacementDeadline: event.type === "invalid" ? item.replacementDeadline : null,
              }
            : item,
        ),
      );
    });
    return unsub;
  }, [orderId]);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === status);

  function handlePickupConfirmed() {
    setStatus("pickup_confirmed");
  }

  async function handleStartDelivery() {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "in_transit" }),
    });
    if (res.ok) setStatus("in_transit");
  }

  function handleDelivered(result: { amountCharged: number }) {
    setStatus("delivered");
    setDeliveredAmount(result.amountCharged);
  }

  function handleVoucherStatusChange(itemId: string, newStatus: string, deadline?: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, voucherStatus: newStatus, replacementDeadline: deadline ?? null }
          : item,
      ),
    );
  }

  if (status === "delivered") {
    const earnedRands = deliveredAmount != null ? (deliveredAmount / 100).toFixed(2) : null;
    return (
      <div className="max-w-xl mx-auto py-12 px-4 text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-green-700">Delivery Complete!</h1>
        {earnedRands && (
          <p className="text-gray-600">
            Your payout: <span className="font-bold text-green-700">R{earnedRands}</span>
          </p>
        )}
        <a href="/driver" className="block text-sm text-green-600 underline mt-4">
          Back to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-5">
      {/* Progress indicator */}
      <div className="flex items-center gap-1">
        {STATUS_STEPS.map((step, i) => (
          <div key={step.key} className="flex items-center flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i <= currentStepIndex
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-400"
              }`}
            >
              {i < currentStepIndex ? "✓" : i + 1}
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                className={`flex-1 h-1 mx-1 ${
                  i < currentStepIndex ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 -mt-1">
        {STATUS_STEPS.map((step) => (
          <span key={step.key}>{step.label}</span>
        ))}
      </div>

      {/* Order summary */}
      <Card className="p-4 space-y-1">
        <p className="font-semibold text-sm">{initialOrder.storeName}</p>
        <p className="text-xs text-gray-500">{initialOrder.storeAddress}</p>
        <p className="text-xs text-gray-400 mt-1">
          Delivering to: {initialOrder.deliveryAddress}
        </p>
      </Card>

      {/* Voucher items (mark invalid) */}
      {(status === "driver_assigned" || status === "pickup_confirmed") && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Voucher Items</h2>
          {items.map((item) => (
            <VoucherInvalidReport
              key={item.id}
              orderId={orderId}
              item={item}
              onStatusChange={handleVoucherStatusChange}
            />
          ))}
        </Card>
      )}

      {/* Step-specific actions */}
      {status === "driver_assigned" && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Confirm Pickup</h2>
          <PickupConfirmation
            orderId={orderId}
            storeLatitude={initialOrder.storeLatitude}
            storeLongitude={initialOrder.storeLongitude}
            onConfirmed={handlePickupConfirmed}
          />
        </Card>
      )}

      {status === "pickup_confirmed" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Head to Customer</h2>
          <p className="text-xs text-gray-500">
            Deliver to: {initialOrder.deliveryAddress}
          </p>
          <button
            onClick={handleStartDelivery}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            I&apos;m on my way
          </button>
        </Card>
      )}

      {status === "in_transit" && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Scan Delivery QR</h2>
          <p className="text-xs text-gray-500 mb-3">
            Arrive at {initialOrder.deliveryAddress} and scan the customer&apos;s QR code to
            complete delivery.
          </p>
          <QRScanner orderId={orderId} onDelivered={handleDelivered} />
        </Card>
      )}

      {/* Cancel order — only before leaving the store */}
      {(status === "driver_assigned" || status === "pickup_confirmed") && (
        <CancelOrderButton orderId={orderId} />
      )}
    </div>
  );
}

function CancelOrderButton({ orderId }: { orderId: string }) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    if (!confirm("Cancel this order? This will count against your cancellation record.")) return;
    setIsCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to cancel order.");
        return;
      }
      window.location.href = "/driver";
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="pt-2">
      {error && <Alert variant="error">{error}</Alert>}
      <button
        onClick={handleCancel}
        disabled={isCancelling}
        className="text-xs text-red-500 underline disabled:opacity-50"
      >
        {isCancelling ? "Cancelling…" : "Cancel this order"}
      </button>
    </div>
  );
}
