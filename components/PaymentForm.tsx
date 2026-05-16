"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PaymentForm({
  orderId,
  invoiceAmount,
}: {
  orderId: number;
  invoiceAmount: string | null;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState(invoiceAmount ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid_date: date, paid_amount: Number(amount) }),
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
      <div className="rounded-lg border border-slate-200 bg-white p-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Paid date *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Paid amount *</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            required
          />
        </label>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Record payment"}
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
