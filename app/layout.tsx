import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Order Tracker",
  description: "Order-to-cash tracking for landscaping supplies",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold">
              Order Tracker
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">Dashboard</Link>
              <Link href="/orders/new" className="hover:underline">New Order</Link>
              <a href="/api/orders/export" className="hover:underline">Export CSV</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
