"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

type LocationStatus =
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "error";

interface DriverDashboardClientProps {
  driverId: string;
  initialStatus: "available" | "offline";
}

const LOCATION_INTERVAL_MS = 30_000; // push location every 30 s

async function pushLocation(lat: number, lng: number) {
  await fetch("/api/drivers/me/location", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: lat, longitude: lng }),
  });
}

export function DriverDashboardClient({ driverId, initialStatus }: DriverDashboardClientProps) {
  const [driverStatus, setDriverStatus] = useState<"available" | "offline">(initialStatus);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<OrderBroadcast[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("requesting");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  // ── Geolocation tracking ──────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    function onSuccess(pos: GeolocationPosition) {
      const { latitude, longitude } = pos.coords;
      lastPositionRef.current = { lat: latitude, lng: longitude };
      setLocationStatus("active");
      pushLocation(latitude, longitude).catch(() => {});
    }

    function onError(err: GeolocationPositionError) {
      if (err.code === GeolocationPositionError.PERMISSION_DENIED) {
        setLocationStatus("denied");
      } else {
        setLocationStatus("error");
      }
    }

    // Get initial fix immediately
    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });

    // Watch for movement
    const watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 15_000,
    });

    // Also push on a fixed interval in case the device is stationary
    intervalRef.current = setInterval(() => {
      if (lastPositionRef.current) {
        pushLocation(
          lastPositionRef.current.lat,
          lastPositionRef.current.lng,
        ).catch(() => {});
      }
    }, LOCATION_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ── Realtime order broadcasts ─────────────────────────────────────────────
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
        setAvailableOrders((prev) =>
          prev.filter((o) => o.orderId !== claimedOrderId),
        );
      },
    );
    return unsubscribe;
  }, [driverId]);

  const handleToggleStatus = useCallback(async () => {
    const next = driverStatus === "available" ? "offline" : "available";
    setIsTogglingStatus(true);
    setError("");
    try {
      const res = await fetch("/api/drivers/me/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        setDriverStatus(next);
        if (next === "offline") setAvailableOrders([]);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update status.");
      }
    } finally {
      setIsTogglingStatus(false);
    }
  }, [driverStatus]);

  const handleAccept = useCallback(async (orderId: string) => {
    setAcceptingId(orderId);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setAvailableOrders((prev) =>
            prev.filter((o) => o.orderId !== orderId),
          );
        } else {
          setError(data.error || "Failed to accept order.");
        }
        return;
      }
      window.location.href = `/driver/orders/${orderId}`;
    } finally {
      setAcceptingId(null);
    }
  }, []);

  // ── Location status badge ─────────────────────────────────────────────────
  const locationBadge: Record<
    LocationStatus,
    { label: string; className: string }
  > = {
    requesting: {
      label: "📡 Getting location…",
      className: "bg-yellow-100 text-yellow-700",
    },
    active: {
      label: "📍 Location active",
      className: "bg-green-100 text-green-700",
    },
    denied: {
      label: "🚫 Location denied",
      className: "bg-red-100 text-red-700",
    },
    unavailable: {
      label: "⚠️ GPS unavailable",
      className: "bg-gray-100 text-gray-600",
    },
    error: {
      label: "⚠️ Location error",
      className: "bg-orange-100 text-orange-700",
    },
  };

  const badge = locationBadge[locationStatus];

  return (
    <div className="space-y-4">
      {/* Online / offline toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {driverStatus === "available" ? "You are online" : "You are offline"}
        </span>
        <button
          onClick={handleToggleStatus}
          disabled={isTogglingStatus}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
            driverStatus === "available" ? "bg-green-500" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              driverStatus === "available" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Location status */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${badge.className}`}
        >
          {badge.label}
        </span>
        {locationStatus === "denied" && (
          <span className="text-xs text-gray-400">
            Enable location in browser settings to receive nearby orders.
          </span>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {driverStatus === "offline" ? (
        <p className="text-gray-400 text-sm">
          You are offline. Toggle the switch above to start receiving orders.
        </p>
      ) : availableOrders.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No orders available in your area right now. Make sure you&apos;re
          online and within the delivery zone.
        </p>
      ) : (
        <div className="space-y-3">
          {availableOrders.map((order) => (
            <DriverOrderCard
              key={order.orderId}
              order={order}
              onAccept={handleAccept}
              isAccepting={acceptingId === order.orderId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
