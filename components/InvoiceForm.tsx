"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InvoiceForm({
  orderId,
  initialInvoice,
  initialAmount,
  initialDate,
}: {
  orderId: number;
  initialInvoice: string | null;
  initialAmount: string | null;
  initialDate: string | null;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice ?? "");
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [date, setDate] = useState(initialDate ?? today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_number: invoiceNumber,
        invoice_amount: Number(amount),
        invoice_date: date,
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
      <div className="rounded-lg border border-slate-200 bg-white p-4 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Invoice # *</span>
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Amount *</span>
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
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Invoice date *</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save invoice"}
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
