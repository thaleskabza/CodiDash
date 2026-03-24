"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface OrderBroadcast {
  orderId: string;
  orderNumber: string;
  storeName: string;
  storeAddress: string;
  items: { smoothieItem: string; voucherCode: string | null }[];
  deliveryFee: number;
  distanceKm: number;
}

interface DriverOrderCardProps {
  order: OrderBroadcast;
  onAccept: (orderId: string) => Promise<void>;
  isAccepting?: boolean;
}

export function DriverOrderCard({ order, onAccept, isAccepting }: DriverOrderCardProps) {
  const feeRands = (order.deliveryFee / 100).toFixed(2);
  const tier = order.distanceKm <= 4 ? "0–4 km" : "5–10 km";

  return (
    <Card className="p-4 border-l-4 border-l-green-500">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">{order.storeName}</p>
          <p className="text-xs text-gray-500 truncate">{order.storeAddress}</p>

          <ul className="mt-2 space-y-1">
            {order.items.map((item, i) => (
              <li key={i} className="text-xs text-gray-600">
                • {item.smoothieItem}
                {item.voucherCode && (
                  <span className="text-gray-400 ml-1">({item.voucherCode})</span>
                )}
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {order.distanceKm.toFixed(1)} km · {tier}
            </span>
            <span className="text-sm font-bold text-green-700">R{feeRands}</span>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => onAccept(order.orderId)}
          disabled={isAccepting}
          className="flex-shrink-0"
        >
          {isAccepting ? "Claiming…" : "Accept"}
        </Button>
      </div>
    </Card>
  );
}
