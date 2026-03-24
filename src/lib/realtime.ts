import { createClient } from "@supabase/supabase-js";

let realtimeClient: ReturnType<typeof createClient> | null = null;

function getRealtimeClient() {
  if (!realtimeClient) {
    realtimeClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return realtimeClient;
}

/**
 * Subscribe to order status changes for a specific order.
 * Used by customer order tracking page.
 */
export function subscribeToOrder(
  orderId: string,
  onStatusChange: (status: string) => void,
): () => void {
  const supabase = getRealtimeClient();

  const channel = supabase
    .channel(`order:${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      },
      (payload) => {
        const newStatus = (payload.new as { status: string }).status;
        if (newStatus) onStatusChange(newStatus);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to available order broadcasts for a driver.
 * Listens for new orders broadcast to nearby drivers.
 * Used by driver dashboard.
 */
export function subscribeToDriverBroadcasts(
  driverId: string,
  onNewOrder: (order: unknown) => void,
  onOrderClaimed: (orderId: string) => void,
): () => void {
  const supabase = getRealtimeClient();

  const channel = supabase
    .channel(`driver-broadcasts:${driverId}`)
    .on("broadcast", { event: "new_order" }, (payload) => {
      onNewOrder(payload.payload);
    })
    .on("broadcast", { event: "order_claimed" }, (payload) => {
      onOrderClaimed((payload.payload as { orderId: string }).orderId);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to voucher replacement events for a specific order item.
 * Used by both driver (sees replacement) and customer (countdown timer).
 */
export function subscribeToVoucherEvents(
  orderId: string,
  onEvent: (event: {
    type: "invalid" | "replaced" | "expired";
    itemId: string;
  }) => void,
): () => void {
  const supabase = getRealtimeClient();

  const channel = supabase
    .channel(`voucher:${orderId}`)
    .on("broadcast", { event: "voucher_invalid" }, (payload) => {
      onEvent({ type: "invalid", itemId: (payload.payload as { itemId: string }).itemId });
    })
    .on("broadcast", { event: "voucher_replaced" }, (payload) => {
      onEvent({ type: "replaced", itemId: (payload.payload as { itemId: string }).itemId });
    })
    .on("broadcast", { event: "voucher_expired" }, (payload) => {
      onEvent({ type: "expired", itemId: (payload.payload as { itemId: string }).itemId });
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
