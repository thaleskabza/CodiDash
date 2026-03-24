"use client";

interface DeliveryFeeDisplayProps {
  distanceKm: number | null;
  fee: number | null;
  isCalculating?: boolean;
  error?: string;
}

export function DeliveryFeeDisplay({
  distanceKm,
  fee,
  isCalculating,
  error,
}: DeliveryFeeDisplayProps) {
  if (isCalculating) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 animate-pulse">
        <p className="text-sm text-gray-500">Calculating delivery fee…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border rounded-lg p-4 bg-red-50 border-red-200">
        <p className="text-sm font-medium text-red-700">Delivery unavailable</p>
        <p className="text-xs text-red-500 mt-0.5">{error}</p>
      </div>
    );
  }

  if (fee === null || distanceKm === null) {
    return null;
  }

  const feeRands = (fee / 100).toFixed(2);
  const tier = distanceKm <= 4 ? "0–4 km" : "5–10 km";

  return (
    <div className="border rounded-lg p-4 bg-green-50 border-green-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">Delivery Fee</p>
          <p className="text-xs text-green-600 mt-0.5">
            {distanceKm.toFixed(1)} km from store · {tier} tier
          </p>
        </div>
        <p className="text-2xl font-bold text-green-700">R{feeRands}</p>
      </div>
    </div>
  );
}
