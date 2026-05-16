import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, string> = {
  pending: "bg-slate-200 text-slate-800",
  delivered: "bg-blue-100 text-blue-800",
  invoiced: "bg-amber-100 text-amber-900",
  paid: "bg-emerald-100 text-emerald-800",
  overdue: "bg-red-100 text-red-800 font-semibold",
};

const LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  delivered: "Delivered",
  invoiced: "Invoiced",
  paid: "Paid",
  overdue: "Overdue",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
