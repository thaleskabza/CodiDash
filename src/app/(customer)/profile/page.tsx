import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";

export default async function CustomerProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  const addresses = await prisma.deliveryAddress.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  return (
    <ProfileClient
      user={{ name: user!.name, email: user!.email }}
      initialAddresses={addresses.map((a) => ({
        id: a.id,
        label: a.label ?? undefined,
        address: a.address,
        isDefault: a.isDefault,
        latitude: Number(a.latitude),
        longitude: Number(a.longitude),
      }))}
    />
  );
}
