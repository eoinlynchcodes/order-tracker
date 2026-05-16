import Link from "next/link";
import { listOrders } from "@/lib/db";
import { computeStatus, type OrderStatus } from "@/lib/types";
import { DashboardTable } from "@/components/DashboardTable";

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
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

      <DashboardTable rows={filtered} />
    </div>
  );
}
