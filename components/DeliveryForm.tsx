"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderItem } from "@/lib/types";

type Row = { name: string; quantity: number; confirmed: number };

export function DeliveryForm({
  orderId,
  ordered,
}: {
  orderId: number;
  ordered: OrderItem[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<Row[]>(
    ordered.map((o) => ({ ...o, confirmed: o.quantity })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateConfirmed(idx: number, val: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, confirmed: val } : r)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actual_delivery_date: date,
        delivered_items: rows.map((r) => ({
          name: r.name,
          quantity: Number(r.confirmed),
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    router.push(`/orders/${orderId}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Actual delivery date *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            required
          />
        </label>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1">Item</th>
              <th className="py-1 text-right">Ordered</th>
              <th className="py-1 text-right">Delivered</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const mismatch = Number(r.confirmed) !== r.quantity;
              return (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1">{r.name}</td>
                  <td className="py-1 text-right">{r.quantity}</td>
                  <td className="py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.confirmed}
                      onChange={(e) => updateConfirmed(i, Number(e.target.value))}
                      className={`w-24 rounded border px-2 py-1 text-right ${
                        mismatch ? "border-red-400 bg-red-50" : "border-slate-300"
                      }`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Confirm delivery"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
