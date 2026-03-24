import { auth } from "@/lib/auth";
import { NavBar } from "@/components/customer/NavBar";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gray-50">
      {session?.user && (
        <NavBar userName={session.user.name?.split(" ")[0] ?? ""} />
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
