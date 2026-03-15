"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { QRCodeDisplay } from "@/components/customer/QRCodeDisplay";
import { subscribeToOrder } from "@/lib/realtime";

const STATUS_STEPS = [
  { key: "pending_driver", label: "Finding Driver" },
  { key: "driver_assigned", label: "Driver Assigned" },
  { key: "pickup_confirmed", label: "At Store" },
  { key: "in_transit", label: "On the Way" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_DESCRIPTIONS: Record<string, string> = {
  pending_driver: "We're finding a driver near your pickup store.",
  driver_assigned: "A driver has accepted your order and is heading to the store.",
  pickup_confirmed: "Your driver is at the store collecting your smoothies.",
  in_transit: "Your order is on its way! Have your QR code ready.",
  delivered: "Your order has been delivered. Enjoy your smoothies! 🥤",
  cancelled: "This order has been cancelled.",
  payment_pending: "Payment is pending. Please check your payment method.",
};

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  deliveryFee: number;
  distanceKm: number;
  storeName: string;
  storeAddress: string;
  driverName: string | null;
  items: { id: string; smoothieItem: string; voucherStatus: string }[];
  qrPayload: string | null;
  qrExpiresAt: string | null;
  paymentStatus: string | null;
  createdAt: string;
}

export function OrderTrackingClient({ order: initialOrder }: { order: OrderData }) {
  const [status, setStatus] = useState(initialOrder.status);

  useEffect(() => {
    const unsubscribe = subscribeToOrder(initialOrder.id, (newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, [initialOrder.id]);

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === status);
  const isCancelled = status === "cancelled";
  const isDelivered = status === "delivered";
  const showQR = ["driver_assigned", "pickup_confirmed", "in_transit"].includes(status);

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order Tracking</h1>
          <p className="text-sm text-gray-500">{initialOrder.orderNumber}</p>
        </div>
        <span className="text-sm text-gray-400">
          {new Date(initialOrder.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Status description */}
      {!isCancelled && (
        <Alert variant={isDelivered ? "success" : "info"}>
          {STATUS_DESCRIPTIONS[status] ?? "Processing your order…"}
        </Alert>
      )}
      {isCancelled && (
        <Alert variant="error">{STATUS_DESCRIPTIONS["cancelled"]}</Alert>
      )}

      {/* Progress stepper */}
      {!isCancelled && (
        <Card className="p-5">
          <div className="relative">
            {/* Track line */}
            <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200" />
            <div
              className="absolute left-4 top-5 w-0.5 bg-green-500 transition-all duration-500"
              style={{
                height: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
              }}
            />

            <ol className="space-y-6 relative">
              {STATUS_STEPS.map((step, index) => {
                const isDone = index < currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <li key={step.key} className="flex items-center gap-4 pl-2">
                    <span
                      className={`w-4 h-4 rounded-full border-2 z-10 flex-shrink-0 transition-colors ${
                        isDone
                          ? "bg-green-500 border-green-500"
                          : isCurrent
                          ? "bg-white border-green-500"
                          : "bg-white border-gray-300"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        isCurrent
                          ? "font-semibold text-green-700"
                          : isDone
                          ? "text-gray-500"
                          : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        Now
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </Card>
      )}

      {/* QR code — shown when driver is assigned through in_transit */}
      {showQR && initialOrder.qrPayload && initialOrder.qrExpiresAt && (
        <Card className="p-5">
          <QRCodeDisplay
            orderId={initialOrder.id}
            initialQrPayload={initialOrder.qrPayload}
            initialExpiresAt={initialOrder.qrExpiresAt}
          />
        </Card>
      )}

      {/* Order summary */}
      <Card className="p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">Order Summary</h2>
        <div className="text-sm text-gray-600">
          <p>
            <span className="font-medium">Store:</span> {initialOrder.storeName}
          </p>
          <p className="mt-1">
            <span className="font-medium">Distance:</span>{" "}
            {initialOrder.distanceKm.toFixed(1)} km
          </p>
          <p className="mt-1">
            <span className="font-medium">Delivery fee:</span> R
            {(initialOrder.deliveryFee / 100).toFixed(2)}
          </p>
          {initialOrder.driverName && (
            <p className="mt-1">
              <span className="font-medium">Driver:</span> {initialOrder.driverName}
            </p>
          )}
        </div>

        <ul className="mt-2 space-y-1">
          {initialOrder.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span>{item.smoothieItem}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  item.voucherStatus === "valid"
                    ? "bg-green-100 text-green-700"
                    : item.voucherStatus === "invalid"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.voucherStatus}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
