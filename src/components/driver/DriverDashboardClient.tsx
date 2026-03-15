"use client";

import { useState, useEffect, useCallback } from "react";
import { DriverOrderCard } from "./DriverOrderCard";
import { Alert } from "@/components/ui/Alert";
import { subscribeToDriverBroadcasts } from "@/lib/realtime";

interface OrderBroadcast {
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  items: { smoothieItem: string; voucherCode: string | null }[];
  deliveryFee: number;
  distanceKm: number;
}

interface DriverDashboardClientProps {
  driverId: string;
}

export function DriverDashboardClient({ driverId }: DriverDashboardClientProps) {
  const [availableOrders, setAvailableOrders] = useState<OrderBroadcast[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToDriverBroadcasts(
      driverId,
      (order) => {
        setAvailableOrders((prev) => {
          const o = order as OrderBroadcast;
          if (prev.some((x) => x.orderId === o.orderId)) return prev;
          return [o, ...prev];
        });
      },
      (claimedOrderId) => {
        setAvailableOrders((prev) => prev.filter((o) => o.orderId !== claimedOrderId));
      },
    );
    return unsubscribe;
  }, [driverId]);

  const handleAccept = useCallback(async (orderId: string) => {
    setAcceptingId(orderId);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Already claimed by another driver — remove from list
          setAvailableOrders((prev) => prev.filter((o) => o.orderId !== orderId));
        } else {
          setError(data.error || "Failed to accept order.");
        }
        return;
      }
      // Redirect to active order page
      window.location.href = `/driver/orders/${orderId}`;
    } finally {
      setAcceptingId(null);
    }
  }, []);

  if (availableOrders.length === 0) {
    return (
      <p className="text-gray-500 text-sm">
        No orders available in your area right now. Make sure you&apos;re online and within the
        delivery zone.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <Alert variant="error">{error}</Alert>}
      {availableOrders.map((order) => (
        <DriverOrderCard
          key={order.orderId}
          order={order}
          onAccept={handleAccept}
          isAccepting={acceptingId === order.orderId}
        />
      ))}
    </div>
  );
}
