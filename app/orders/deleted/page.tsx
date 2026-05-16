import Link from "next/link";
import { listDeletedOrders } from "@/lib/db";
import { RestoreOrderButton } from "@/components/RestoreOrderButton";

export const dynamic = "force-dynamic";

export default async function DeletedOrdersPage() {
  const orders = await listDeletedOrders();

  return (
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:underline">← Back to dashboard</Link>
        <h1 className="mt-1 text-2xl font-semibold">Deleted orders</h1>
        <p className="text-sm text-slate-600">
          Hidden from the main dashboard. Restore to bring an order back.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">Order Date</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Deleted</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No deleted orders.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-200 align-top text-slate-600">
                <td className="px-3 py-2 font-mono text-xs">{o.id}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{o.supplier_name}</div>
                  {o.contact_number && <div className="text-xs text-slate-500">{o.contact_number}</div>}
                </td>
                <td className="px-3 py-2">{o.order_date}</td>
                <td className="px-3 py-2">{o.invoice_number ?? "—"}</td>
                <td className="px-3 py-2">{o.invoice_amount != null ? `€${o.invoice_amount}` : "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {o.deleted_at ? new Date(o.deleted_at).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <RestoreOrderButton orderId={o.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
