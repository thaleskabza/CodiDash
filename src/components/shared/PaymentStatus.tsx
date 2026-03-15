"use client";

interface PaymentStatusProps {
  status: string;
  amountCharged: number | null;
  deliveryFee: number;
  showSplit?: boolean;
}

const SPLITS: Record<number, { driver: number; platform: number }> = {
  3500: { driver: 2000, platform: 1500 },
  4500: { driver: 2571, platform: 1929 },
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: "Payment pending", className: "text-yellow-600" },
  completed: { label: "Payment complete", className: "text-green-600" },
  failed: { label: "Payment failed", className: "text-red-600" },
  refunded: { label: "Refunded", className: "text-gray-500" },
};

function rands(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export function PaymentStatus({
  status,
  amountCharged,
  deliveryFee,
  showSplit = false,
}: PaymentStatusProps) {
  const statusInfo = STATUS_LABELS[status] ?? { label: status, className: "text-gray-600" };
  const split = SPLITS[deliveryFee];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${statusInfo.className}`}>{statusInfo.label}</span>
        {amountCharged != null && (
          <span className="text-sm text-gray-700">&middot; {rands(amountCharged)}</span>
        )}
      </div>

      {showSplit && split && amountCharged != null && (
        <div className="text-xs text-gray-500 space-y-0.5">
          <p>Driver payout: {rands(split.driver)}</p>
          <p>Platform fee: {rands(split.platform)}</p>
        </div>
      )}
    </div>
  );
}
