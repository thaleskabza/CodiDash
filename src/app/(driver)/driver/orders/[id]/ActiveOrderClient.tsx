"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
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
  itemName: string | null;
  items: OrderItem[];
}

interface ActiveOrderClientProps {
  orderId: string;
  order: OrderData;
}

const STATUS_STEPS = [
  { key: "driver_assigned", label: "Accepted" },
  { key: "driver_at_store", label: "At Store" },
  { key: "collected", label: "Collected" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

export function ActiveOrderClient({ orderId, order: initialOrder }: ActiveOrderClientProps) {
  const [status, setStatus] = useState(initialOrder.status);
  const [items, setItems] = useState<OrderItem[]>(initialOrder.items);
  const [deliveredAmount, setDeliveredAmount] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

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

  async function postLifecycle(endpoint: string, body?: object) {
    setActionError("");
    const res = await fetch(`/api/orders/${orderId}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok) {
      setActionError(data.error || `Failed to update order.`);
      return null;
    }
    return data;
  }

  async function handleAtStore() {
    const data = await postLifecycle("at-store");
    if (data) setStatus("driver_at_store");
  }

  async function handleOutForDelivery() {
    const data = await postLifecycle("out-for-delivery");
    if (data) setStatus("out_for_delivery");
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

      {actionError && <Alert variant="error">{actionError}</Alert>}

      {/* Order summary */}
      <Card className="p-4 space-y-1">
        <p className="font-semibold text-sm">{initialOrder.storeName}</p>
        <p className="text-xs text-gray-500">{initialOrder.storeAddress}</p>
        {initialOrder.itemName && (
          <p className="text-xs text-gray-700 mt-1">Item: {initialOrder.itemName}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Delivering to: {initialOrder.deliveryAddress}
        </p>
      </Card>

      {/* Voucher items (mark invalid) — only before item is collected */}
      {(status === "driver_assigned" || status === "driver_at_store") && (
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

      {/* Step 1 — On the way to store */}
      {status === "driver_assigned" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Head to Store</h2>
          <p className="text-xs text-gray-500">{initialOrder.storeAddress}</p>
          <button
            onClick={handleAtStore}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            I&apos;ve Arrived at Store
          </button>
        </Card>
      )}

      {/* Step 2 — Collect item from store */}
      {status === "driver_at_store" && (
        <CollectCard orderId={orderId} onCollected={() => setStatus("collected")} onError={setActionError} />
      )}

      {/* Step 3 — Mark out for delivery */}
      {status === "collected" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Head to Customer</h2>
          <p className="text-xs text-gray-500">
            Deliver to: {initialOrder.deliveryAddress}
          </p>
          <button
            onClick={handleOutForDelivery}
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            I&apos;m Out for Delivery
          </button>
        </Card>
      )}

      {/* Step 4 — Scan QR at customer door */}
      {status === "out_for_delivery" && (
        <Card className="p-4">
          <h2 className="text-sm font-semibold mb-3">Scan Delivery QR</h2>
          <p className="text-xs text-gray-500 mb-3">
            Arrive at {initialOrder.deliveryAddress} and scan the customer&apos;s QR code to
            complete delivery.
          </p>
          <QRScanner orderId={orderId} onDelivered={handleDelivered} />
        </Card>
      )}

      {/* Cancel order — only before collection */}
      {(status === "driver_assigned" || status === "driver_at_store") && (
        <CancelOrderButton orderId={orderId} />
      )}
    </div>
  );
}

function CollectCard({
  orderId,
  onCollected,
  onError,
}: {
  orderId: string;
  onCollected: () => void;
  onError: (msg: string) => void;
}) {
  const [receiptImageUrl, setReceiptImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCollect() {
    if (!receiptImageUrl.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/collect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptImageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Failed to confirm collection.");
        return;
      }
      onCollected();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <h2 className="text-sm font-semibold">Collect Item from Store</h2>
      <p className="text-xs text-gray-500">
        Enter the receipt image URL after collecting the item.
      </p>
      <input
        type="url"
        value={receiptImageUrl}
        onChange={(e) => setReceiptImageUrl(e.target.value)}
        placeholder="Receipt image URL…"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        disabled={isSubmitting}
      />
      <button
        onClick={handleCollect}
        disabled={!receiptImageUrl.trim() || isSubmitting}
        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {isSubmitting ? "Confirming…" : "Confirm Collection"}
      </button>
    </Card>
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
