import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodiDash — Voucher Delivery Platform",
  description: "Fast, reliable voucher delivery to your door.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
