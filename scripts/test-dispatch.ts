/**
 * Test script: verifies that dispatchOrder finds nearby drivers and broadcasts.
 *
 * Usage:  npx tsx --env-file=.env scripts/test-dispatch.ts [orderId]
 *
 * If no orderId is supplied, the most recent pending_driver order is used.
 */

import { prisma } from "../src/lib/prisma";
import { dispatchOrder } from "../src/lib/dispatch";
import { calculateDistance } from "../src/lib/geo";

async function run() {
  let orderId = process.argv[2];

  if (!orderId) {
    const latest = await prisma.order.findFirst({
      where: { status: "pending_driver" },
      orderBy: { createdAt: "desc" },
    });
    if (!latest) {
      console.error("No pending_driver orders found. Create an order first.");
      process.exit(1);
    }
    orderId = latest.id;
    console.log(`No orderId supplied — using latest: ${orderId}`);
  }

  // ── Pre-flight: show store + driver positions ────────────────────────────
  const [order, drivers] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { store: true },
    }),
    prisma.driver.findMany({
      where: { status: "available" },
      include: { user: { select: { name: true } } },
    }),
  ]);

  if (!order) {
    console.error("Order not found:", orderId);
    process.exit(1);
  }

  const store = order.store;
  console.log("\n=== Store ===");
  console.log(`  ${store.name}  (${store.latitude}, ${store.longitude})`);

  console.log("\n=== Available Drivers ===");
  for (const d of drivers) {
    const hasLocation = d.latitude != null && d.longitude != null;
    const dist = hasLocation
      ? calculateDistance(
          { latitude: Number(store.latitude), longitude: Number(store.longitude) },
          { latitude: Number(d.latitude), longitude: Number(d.longitude) },
        ).toFixed(2)
      : "no location";
    const flag = hasLocation && Number(dist) <= 4 ? "✓ IN RANGE" : "✗ out of range";
    console.log(`  ${d.user.name}  dist=${dist}km  ${flag}`);
  }

  // ── Run dispatch ──────────────────────────────────────────────────────────
  console.log("\n=== Running dispatchOrder ===");
  const result = await dispatchOrder(orderId);
  console.log("\n=== Result ===");
  console.log(JSON.stringify(result, null, 2));

  if (result.broadcasted === 0) {
    console.error("\n✗ No drivers notified. Check locations and Supabase key.");
  } else {
    console.log(`\n✓ Broadcast sent to ${result.broadcasted} driver(s) via tier=${result.tier}`);
  }
}

run()
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
