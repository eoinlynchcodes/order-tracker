import Link from "next/link";
import { listOrders } from "@/lib/db";
import { computeStatus, type Order, type OrderStatus } from "@/lib/types";
import { DashboardTable, type SortKey, type SortDir } from "@/components/DashboardTable";

export const dynamic = "force-dynamic";

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "invoiced", label: "Invoiced" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
];

const SORT_KEYS: SortKey[] = ["order_date", "amount", "due_date"];

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; sort?: string; dir?: string }>;
}) {
  const { status, sort, dir } = await searchParams;
  const filter = (FILTERS.find((f) => f.value === status)?.value ?? "all") as OrderStatus | "all";
  const sortKey: SortKey = (SORT_KEYS.includes(sort as SortKey) ? sort : "order_date") as SortKey;
  const sortDir: SortDir = dir === "asc" ? "asc" : "desc";

  const orders = await listOrders();
  const withStatus = orders.map((o) => ({ order: o, status: computeStatus(o) }));

  const counts: Record<OrderStatus | "all", number> = {
    all: withStatus.length,
    pending: 0,
    delivered: 0,
    invoiced: 0,
    paid: 0,
    overdue: 0,
  };
  for (const r of withStatus) counts[r.status]++;

  const filtered = filter === "all" ? withStatus : withStatus.filter((r) => r.status === filter);
  const sorted = [...filtered].sort((a, b) => compare(a.order, b.order, sortKey, sortDir));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = f.value === filter;
          const params = new URLSearchParams();
          if (f.value !== "all") params.set("status", f.value);
          if (sort) params.set("sort", sortKey);
          if (dir) params.set("dir", sortDir);
          const qs = params.toString();
          return (
            <Link
              key={f.value}
              href={qs ? `/?${qs}` : "/"}
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

      <DashboardTable
        rows={sorted}
        filter={filter === "all" ? null : filter}
        sortKey={sortKey}
        sortDir={sortDir}
      />
    </div>
  );
}

function compare(a: Order, b: Order, key: SortKey, dir: SortDir): number {
  const mul = dir === "asc" ? 1 : -1;
  switch (key) {
    case "order_date":
      return mul * cmpStr(a.order_date, b.order_date) || (b.id - a.id);
    case "amount":
      return cmpNullable(amountForSort(a), amountForSort(b), mul);
    case "due_date":
      return cmpNullable(a.payment_due_date, b.payment_due_date, mul);
  }
}

function cmpStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function amountForSort(o: Order): number | null {
  if (o.invoice_amount != null) return Number(o.invoice_amount);
  if (o.paid_amount != null) return Number(o.paid_amount);
  return null;
}

function cmpNullable<T extends string | number>(a: T | null, b: T | null, mul: number): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return mul * (a < b ? -1 : a > b ? 1 : 0);
}
