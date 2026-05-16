"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InvoiceForm({
  orderId,
  initialInvoice,
  initialAmount,
  initialDate,
  initialUrl,
  initialFileUrl,
}: {
  orderId: number;
  initialInvoice: string | null;
  initialAmount: string | null;
  initialDate: string | null;
  initialUrl: string | null;
  initialFileUrl: string | null;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice ?? "");
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [date, setDate] = useState(initialDate ?? today);
  const [url, setUrl] = useState(initialUrl ?? "");
  const [fileUrl, setFileUrl] = useState(initialFileUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/orders/${orderId}/invoice-file`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }
    const data = await res.json();
    setFileUrl(data.url);
  }

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
        invoice_url: url || null,
        invoice_file_url: fileUrl || null,
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
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Invoice #" required>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Amount (€)" required>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
          <Field label="Invoice date" required>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              required
            />
          </Field>
        </div>

        <Field label="Invoice link (paste a URL — Google Drive, Dropbox, supplier portal, …)">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </Field>

        <Field label="Or upload the invoice file (PDF / image, max 10MB)">
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp,image/heic"
              onChange={handleFile}
              disabled={uploading}
              className="text-sm"
            />
            {uploading && <span className="text-xs text-slate-500">Uploading…</span>}
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-700 hover:underline"
              >
                view uploaded file ↗
              </a>
            )}
            {fileUrl && (
              <button
                type="button"
                onClick={() => setFileUrl("")}
                className="text-xs text-red-600 hover:underline"
              >
                remove
              </button>
            )}
          </div>
        </Field>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || uploading}
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

const inputCls =
  "w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm focus:border-slate-500 focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-3 block last:mb-0">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}
