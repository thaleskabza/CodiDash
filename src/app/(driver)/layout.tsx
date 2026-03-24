import { auth } from "@/lib/auth";
import { DriverNav } from "@/components/driver/DriverNav";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <main>{children}</main>
      {session?.user && <DriverNav />}
    </div>
  );
}
