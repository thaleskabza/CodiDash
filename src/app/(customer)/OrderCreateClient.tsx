"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StoreSelector } from "@/components/customer/StoreSelector";
import { VoucherItemForm, type VoucherItem } from "@/components/customer/VoucherItemForm";
import { DeliveryFeeDisplay } from "@/components/customer/DeliveryFeeDisplay";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface Address {
  id: string;
  label?: string;
  address: string;
  isDefault: boolean;
}

interface OrderCreateClientProps {
  stores: Store[];
  menuItems: { name: string; category?: string | null }[];
  addresses: Address[];
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export function OrderCreateClient({
  stores,
  menuItems,
  addresses,
}: OrderCreateClientProps) {
  const router = useRouter();
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  const [storeId, setStoreId] = useState(stores[0]?.id ?? "");
  const [addressId, setAddressId] = useState(defaultAddress?.id ?? "");
  const [items, setItems] = useState<VoucherItem[]>([
    { id: generateId(), voucherCode: "", voucherImageUrl: null, voucherInputMode: "code", smoothieItem: "" },
  ]);
  const [feeInfo, setFeeInfo] = useState<{
    fee: number | null;
    distanceKm: number | null;
    error?: string;
  }>({ fee: null, distanceKm: null });
  const [isFeeLoading, setIsFeeLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Recalculate fee when store or address changes
  useEffect(() => {
    if (!storeId || !addressId) return;

    setIsFeeLoading(true);
    setFeeInfo({ fee: null, distanceKm: null });

    // Call a lightweight fee-preview endpoint (we'll use a query param trick on /api/stores)
    // For now, calculate client-side using the store coordinates and geocoded address
    const store = stores.find((s) => s.id === storeId);
    const addr = addresses.find((a) => a.id === addressId);
    if (!store || !addr) {
      setIsFeeLoading(false);
      return;
    }

    // Use the API to get accurate fee (server has @turf/distance)
    fetch(`/api/orders/fee-preview?storeId=${storeId}&addressId=${addressId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setFeeInfo({ fee: null, distanceKm: null, error: data.error });
        } else {
          setFeeInfo({ fee: data.fee, distanceKm: data.distanceKm });
        }
      })
      .catch(() => {
        setFeeInfo({ fee: null, distanceKm: null, error: "Could not calculate delivery fee." });
      })
      .finally(() => setIsFeeLoading(false));
  }, [storeId, addressId, stores, addresses]);

  const isFormValid =
    storeId &&
    addressId &&
    feeInfo.fee !== null &&
    items.length > 0 &&
    items.every(
      (i) =>
        (i.voucherInputMode === "code" ? i.voucherCode.trim() : i.voucherImageUrl) &&
        i.smoothieItem,
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isFormValid) return;
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          deliveryAddressId: addressId,
          items: items.map((i) => ({
            voucherCode: i.voucherInputMode === "code" ? i.voucherCode : undefined,
            voucherImageUrl: i.voucherInputMode === "image" ? i.voucherImageUrl : undefined,
            smoothieItem: i.smoothieItem,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error || "Failed to place order. Please try again.");
        return;
      }

      router.push(`/orders/${data.id}`);
    } catch {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (addresses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <Alert variant="warning">
          You need a saved delivery address before placing an order.{" "}
          <a href="/profile" className="underline font-medium">
            Add an address
          </a>{" "}
          to continue.
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Place Your Order</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Store selection */}
        <Card className="p-5">
          <StoreSelector
            stores={stores}
            selectedId={storeId}
            onChange={setStoreId}
            disabled={isSubmitting}
          />
        </Card>

        {/* Delivery address selection */}
        <Card className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Address
          </label>
          <select
            value={addressId}
            onChange={(e) => setAddressId(e.target.value)}
            disabled={isSubmitting}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {addresses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label ? `${a.label} — ` : ""}
                {a.address}
                {a.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
          <a href="/profile" className="text-xs text-green-600 hover:underline mt-1 block">
            Manage addresses →
          </a>
        </Card>

        {/* Delivery fee display */}
        <DeliveryFeeDisplay
          fee={feeInfo.fee}
          distanceKm={feeInfo.distanceKm}
          isCalculating={isFeeLoading}
          error={feeInfo.error}
        />

        {/* Vouchers + smoothie items */}
        <Card className="p-5">
          <VoucherItemForm
            items={items}
            menuItems={menuItems}
            onChange={setItems}
            disabled={isSubmitting}
          />
        </Card>

        {submitError && <Alert variant="error">{submitError}</Alert>}

        <Button
          type="submit"
          className="w-full"
          disabled={!isFormValid || isSubmitting}
          size="lg"
        >
          {isSubmitting ? "Placing Order…" : `Place Order${feeInfo.fee ? ` · R${(feeInfo.fee / 100).toFixed(2)}` : ""}`}
        </Button>
      </form>
    </div>
  );
}
