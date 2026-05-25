"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { type Order, type OrderStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

type Row = { order: Order; status: OrderStatus };

export type SortKey = "order_date" | "amount" | "due_date";
export type SortDir = "asc" | "desc";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "paid", label: "Paid" },
];

export function DashboardTable({
  rows,
  filter,
  sortKey,
  sortDir,
}: {
  rows: Row[];
  filter: OrderStatus | null;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus(orderId: number, target: string) {
    setError(null);
    setBusyId(orderId);
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update status");
      return;
    }
    startTransition(() => router.refresh());
  }

  async function togglePaid(order: Order) {
    setError(null);
    setBusyId(order.id);
    if (order.paid) {
      const res = await fetch(`/api/orders/${order.id}/payment`, { method: "DELETE" });
      setBusyId(null);
      if (!res.ok) {
        setError("Failed to clear payment");
        return;
      }
    } else {
      if (!order.invoice_number) {
        setBusyId(null);
        setError("Add an invoice before marking paid");
        return;
      }
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid" }),
      });
      setBusyId(null);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to mark paid");
        return;
      }
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2">
                <SortHeader label="Order Date" col="order_date" filter={filter} sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">
                <SortHeader label="Amount" col="amount" filter={filter} sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2">
                <SortHeader label="Due" col="due_date" filter={filter} sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-3 py-2">Paid</th>
              <th className="px-3 py-2">Notes</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-slate-500">
                  No orders.
                </td>
              </tr>
            )}
            {rows.map(({ order, status }) => {
              const isBusy = busyId === order.id || pending;
              const dropdownValue = status === "overdue" || status === "invoiced" ? "" : status;
              return (
                <tr
                  key={order.id}
                  className={`border-t border-slate-200 align-top ${
                    status === "overdue" ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-mono text-xs">{order.id}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{order.supplier_name}</div>
                    {order.contact_number && (
                      <div className="text-xs text-slate-500">{order.contact_number}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{order.order_date}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <StatusBadge status={status} />
                      <select
                        disabled={isBusy}
                        value={dropdownValue}
                        onChange={(e) => changeStatus(order.id, e.target.value)}
                        className="rounded border border-slate-300 bg-white px-1 py-0.5 text-xs"
                      >
                        <option value="" disabled>
                          Change…
                        </option>
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {order.invoice_number ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{order.invoice_number}</span>
                        {(order.invoice_file_url || order.invoice_url) && (
                          <a
                            href={order.invoice_file_url ?? order.invoice_url ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-700 hover:underline"
                          >
                            {order.invoice_file_url ? "file" : "link"} ↗
                          </a>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={`/orders/${order.id}/invoice`}
                        className="text-xs text-blue-700 hover:underline"
                      >
                        + Add invoice
                      </Link>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {order.invoice_amount != null ? (
                      `€${order.invoice_amount}`
                    ) : order.paid_amount != null ? (
                      <span title="Paid amount — no invoice recorded yet">
                        €{order.paid_amount}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      status === "overdue" ? "font-semibold text-red-700" : ""
                    }`}
                  >
                    {order.payment_due_date ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        disabled={isBusy || !order.invoice_number}
                        checked={order.paid}
                        onChange={() => togglePaid(order)}
                        className="h-4 w-4"
                      />
                      {order.paid && order.paid_date && (
                        <span className="text-slate-500">{order.paid_date}</span>
                      )}
                    </label>
                  </td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <NotesCell order={order} />
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NotesCell({ order }: { order: Order }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(order.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value || null }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={2}
          className="w-full rounded border border-slate-300 px-1 py-0.5 text-xs"
          autoFocus
        />
        <div className="flex gap-1">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded bg-slate-900 px-2 py-0.5 text-xs text-white disabled:opacity-50"
          >
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setValue(order.notes ?? "");
              setEditing(false);
            }}
            className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full text-left text-xs text-slate-600 hover:text-slate-900"
      title={order.notes ?? ""}
    >
      {order.notes ? (
        <span className="line-clamp-2">{order.notes}</span>
      ) : (
        <span className="text-slate-400">+ Add notes</span>
      )}
    </button>
  );
}

function SortHeader({
  label,
  col,
  filter,
  sortKey,
  sortDir,
}: {
  label: string;
  col: SortKey;
  filter: OrderStatus | null;
  sortKey: SortKey;
  sortDir: SortDir;
}) {
  const active = sortKey === col;
  const nextDir: SortDir = active && sortDir === "desc" ? "asc" : "desc";
  const params = new URLSearchParams();
  if (filter) params.set("status", filter);
  params.set("sort", col);
  params.set("dir", active ? nextDir : "desc");
  const indicator = active ? (sortDir === "desc" ? "↓" : "↑") : "";
  return (
    <Link
      href={`/?${params.toString()}`}
      className={`inline-flex items-center gap-1 hover:text-slate-900 ${
        active ? "text-slate-900" : ""
      }`}
    >
      {label}
      <span className="text-[10px] opacity-70">{indicator || "↕"}</span>
    </Link>
  );
}
