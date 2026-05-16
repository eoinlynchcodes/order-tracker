import Link from "next/link";
import { listOrders } from "@/lib/db";
import { computeStatus, type OrderStatus } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = (FILTERS.find((f) => f.value === status)?.value ?? "all") as OrderStatus | "all";

  const orders = await listOrders();
  const withStatus = orders.map((o) => ({ order: o, status: computeStatus(o) }));
  const filtered = filter === "all" ? withStatus : withStatus.filter((r) => r.status === filter);

  const counts: Record<OrderStatus | "all", number> = {
    all: withStatus.length,
    pending: 0,
    delivered: 0,
    invoiced: 0,
    paid: 0,
    overdue: 0,
  };
  for (const r of withStatus) counts[r.status]++;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/" : `/?status=${f.value}`}
              className={`rounded-full border px-3 py-1 text-sm ${
                active
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white hover:bg-slate-100"
              }`}
            >
              {f.label} <span className="opacity-70">({counts[f.value]})</span>
            </Link>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2">Order Date</th>
              <th className="px-3 py-2">Expected</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Amount</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                  No orders.
                </td>
              </tr>
            )}
            {filtered.map(({ order, status }) => (
              <tr
                key={order.id}
                className={`border-t border-slate-200 ${
                  status === "overdue" ? "bg-red-50" : ""
                }`}
              >
                <td className="px-3 py-2 font-mono text-xs">{order.id}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{order.customer_name}</div>
                  {order.contact_number && (
                    <div className="text-xs text-slate-500">{order.contact_number}</div>
                  )}
                </td>
                <td className="px-3 py-2">{order.order_date}</td>
                <td className="px-3 py-2">{order.expected_delivery_date ?? "—"}</td>
                <td className="px-3 py-2"><StatusBadge status={status} /></td>
                <td className="px-3 py-2">{order.invoice_number ?? "—"}</td>
                <td className="px-3 py-2">
                  {order.invoice_amount != null ? `$${order.invoice_amount}` : "—"}
                </td>
                <td
                  className={`px-3 py-2 ${
                    status === "overdue" ? "font-semibold text-red-700" : ""
                  }`}
                >
                  {order.payment_due_date ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Link
                    href={`/orders/${order.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
