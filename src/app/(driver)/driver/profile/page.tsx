import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "./SignOutButton";

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending_approval: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-800" },
  available: { label: "Available", color: "bg-green-100 text-green-800" },
  busy: { label: "On Delivery", color: "bg-orange-100 text-orange-800" },
  offline: { label: "Offline", color: "bg-gray-100 text-gray-600" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-700" },
};

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const empty = 5 - Math.ceil(rating);
  const hasHalf = rating % 1 >= 0.5;
  return (
    <span className="text-yellow-400 text-lg">
      {"★".repeat(full)}
      {hasHalf ? "½" : ""}
      {"☆".repeat(empty)}
      <span className="text-gray-600 text-sm ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export default async function DriverProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/driver/login");

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!driver) redirect("/driver/login");

  const statusConfig = STATUS_CONFIG[driver.status] ?? {
    label: driver.status,
    color: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-bold">Driver Profile</h1>

      <Card className="p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold">{driver.user.name}</p>
            <p className="text-gray-500 text-sm">{driver.user.email}</p>
          </div>
          <span
            className={`text-xs px-3 py-1 rounded-full font-medium ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Vehicle
            </p>
            <p className="font-medium capitalize">{driver.vehicleType}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Rating
            </p>
            <StarRating rating={Number(driver.rating)} />
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
              Cancellations
            </p>
            <p className="font-medium">{driver.cancellationCount}</p>
          </div>
        </div>
      </Card>

      <SignOutButton />
    </div>
  );
}
