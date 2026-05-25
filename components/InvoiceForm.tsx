"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];
const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

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
  const [isDragOver, setIsDragOver] = useState(false);
  const [parsedFromName, setParsedFromName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    setError(null);
    setParsedFromName(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Unsupported file type: ${file.type || "(unknown)"}. Use PDF or PNG/JPEG/WebP/HEIC.`);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`);
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/orders/${orderId}/invoice/parse`, {
      method: "POST",
      body: form,
    });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed");
      return;
    }
    const data = (await res.json()) as {
      file_url: string;
      parsed: {
        invoice_number: string | null;
        invoice_amount: number | null;
        invoice_date: string | null;
      } | null;
    };
    setFileUrl(data.file_url);
    if (data.parsed) {
      if (data.parsed.invoice_number) setInvoiceNumber(data.parsed.invoice_number);
      if (data.parsed.invoice_amount != null) setAmount(String(data.parsed.invoice_amount));
      if (data.parsed.invoice_date) setDate(data.parsed.invoice_date);
      const anyField =
        data.parsed.invoice_number || data.parsed.invoice_amount != null || data.parsed.invoice_date;
      if (anyField) setParsedFromName(file.name);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void uploadFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (uploading) return;
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragOver(false);
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

        <div className="mb-3 block last:mb-0">
          <span className="mb-1 block text-xs font-medium text-slate-700">
            Or upload the invoice file (PDF / image, max 10MB) — invoice #, amount, and date will be auto-filled
          </span>
          {/* Plain <input> NOT inside a <label> — clicks elsewhere in the form must not re-open the OS file picker */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleInputChange}
            disabled={uploading}
            className="sr-only"
            tabIndex={-1}
          />
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !uploading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !uploading) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Drop a file here or click to browse"
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
              isDragOver
                ? "border-blue-500 bg-blue-50"
                : "border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
            } ${uploading ? "pointer-events-none opacity-60" : ""}`}
          >
            {uploading ? (
              <p className="text-sm text-slate-600">Uploading &amp; reading invoice…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">
                  Drop file here or click to browse
                </p>
                <p className="mt-1 text-xs text-slate-500">PDF, PNG, JPEG, WebP, HEIC — up to 10MB</p>
              </>
            )}
          </div>

          {parsedFromName && (
            <div className="mt-2 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ Prefilled invoice #, amount, and date from <span className="font-medium">{parsedFromName}</span>. Review and edit above before saving.
            </div>
          )}
          {fileUrl && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:underline"
              >
                view uploaded file ↗
              </a>
              <button
                type="button"
                onClick={() => {
                  setFileUrl("");
                  setParsedFromName(null);
                }}
                className="text-red-600 hover:underline"
              >
                remove
              </button>
            </div>
          )}
        </div>
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
