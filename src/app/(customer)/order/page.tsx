import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderCreateClient } from "./OrderCreateClient";

export default async function CustomerHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [stores, menuItems, addresses] = await Promise.all([
    prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true, address: true, latitude: true, longitude: true },
      orderBy: { name: "asc" },
    }),
    prisma.menuItem.findMany({
      where: { isAvailable: true },
      select: { name: true, category: true },
      orderBy: { name: "asc" },
    }),
    prisma.deliveryAddress.findMany({
      where: { userId: session.user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <OrderCreateClient
      stores={stores.map((s) => ({
        ...s,
        latitude: Number(s.latitude),
        longitude: Number(s.longitude),
      }))}
      menuItems={menuItems}
      addresses={addresses.map((a) => ({
        id: a.id,
        label: a.label ?? undefined,
        address: a.address,
        isDefault: a.isDefault,
      }))}
    />
  );
}
