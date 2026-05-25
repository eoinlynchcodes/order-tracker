"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { parsePasted } from "@/lib/parsePasted";
import { PAYMENT_TERMS, type Order, type OrderItem, type PaymentTerms } from "@/lib/types";

type Props = {
  initial?: Order;
  mode: "create" | "edit";
};

export function OrderForm({ initial, mode }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [supplierName, setSupplierName] = useState(initial?.supplier_name ?? "");
  const [contactNumber, setContactNumber] = useState(initial?.contact_number ?? "");
  const [orderDate, setOrderDate] = useState(initial?.order_date ?? today);
  const [expectedDelivery, setExpectedDelivery] = useState(initial?.expected_delivery_date ?? "");
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>(initial?.payment_terms ?? "net_30");
  const [paid, setPaid] = useState<boolean>(initial?.paid ?? false);
  const [paidDate, setPaidDate] = useState(initial?.paid_date ?? "");
  const [paidAmount, setPaidAmount] = useState<string>(initial?.paid_amount ?? "");
  const [paymentNotes, setPaymentNotes] = useState(initial?.payment_notes ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<OrderItem[]>(
    initial?.items?.length
      ? initial.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          code: i.code ?? null,
          notes: i.notes ?? null,
        }))
      : [{ name: "", quantity: 1, code: null, notes: null }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [invoiceFileUrl, setInvoiceFileUrl] = useState<string | null>(initial?.invoice_file_url ?? null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFromName, setParsedFromName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pasteText, setPasteText] = useState("");
  const [pasteWarnings, setPasteWarnings] = useState<string[]>([]);
  const [pasteSummary, setPasteSummary] = useState<string | null>(null);

  function handleParsePaste(mode: "replace" | "append") {
    setPasteWarnings([]);
    setPasteSummary(null);
    const { items: parsed, warnings } = parsePasted(pasteText);
    if (parsed.length === 0) {
      setPasteWarnings(warnings.length ? warnings : ["No items found."]);
      return;
    }
    const mapped: OrderItem[] = parsed.map((p) => ({
      name: p.name,
      quantity: p.quantity,
      code: p.code,
      notes: null,
    }));
    setItems((prev) => {
      if (mode === "replace") return mapped;
      const existing = prev.filter((it) => it.name.trim() || (it.code ?? "").trim());
      return [...existing, ...mapped];
    });
    setPasteSummary(
      `${mode === "replace" ? "Replaced with" : "Appended"} ${parsed.length} item${parsed.length === 1 ? "" : "s"}.`,
    );
    setPasteWarnings(warnings);
  }

  async function handleFile(file: File) {
    setParseError(null);
    if (file.type !== "application/pdf") {
      setParseError("Only PDF files are supported.");
      return;
    }
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/orders/parse-pdf", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Parse failed (${res.status})`);
      }
      const { parsed, file_url } = (await res.json()) as {
        parsed: {
          supplier_name: string;
          contact_number: string | null;
          order_date: string;
          payment_terms: PaymentTerms | null;
          payment_notes: string | null;
          items: { name: string; quantity: number; code?: string | null }[];
        };
        file_url: string;
      };
      if (parsed.supplier_name) setSupplierName(parsed.supplier_name);
      if (parsed.contact_number) setContactNumber(parsed.contact_number);
      if (parsed.order_date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.order_date)) {
        setOrderDate(parsed.order_date);
      }
      if (parsed.payment_terms) setPaymentTerms(parsed.payment_terms);
      if (parsed.payment_notes) setPaymentNotes(parsed.payment_notes);
      if (parsed.items?.length) {
        setItems(
          parsed.items.map((i) => ({
            name: String(i.name ?? ""),
            quantity: Number(i.quantity) || 1,
            code: i.code ? String(i.code) : null,
            notes: null,
          })),
        );
      }
      setInvoiceFileUrl(file_url);
      setParsedFromName(file.name);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : "Parse failed");
    } finally {
      setParsing(false);
    }
  }

  function updateItem(idx: number, patch: Partial<OrderItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1, code: null, notes: null }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanItems = items
      .map((i) => ({
        name: i.name.trim(),
        quantity: Number(i.quantity),
        code: i.code?.trim() ? i.code.trim() : null,
        notes: i.notes?.trim() ? i.notes.trim() : null,
      }))
      .filter((i) => i.name && i.quantity > 0);
    if (cleanItems.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    const paidAmountNum = paidAmount.trim() === "" ? null : Number(paidAmount);
    if (paid && paidAmountNum != null && Number.isNaN(paidAmountNum)) {
      setError("Paid amount must be a number.");
      return;
    }
    const payload = {
      supplier_name: supplierName,
      contact_number: contactNumber || null,
      items: cleanItems,
      order_date: orderDate,
      expected_delivery_date: expectedDelivery || null,
      payment_terms: paymentTerms,
      notes: notes || null,
      invoice_file_url: invoiceFileUrl,
      paid,
      paid_date: paid ? paidDate || null : null,
      paid_amount: paid ? paidAmountNum : null,
      payment_notes: paymentNotes || null,
    };
    const url = mode === "create" ? "/api/orders" : `/api/orders/${initial!.id}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    const saved = await res.json();
    router.push(`/orders/${saved.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {mode === "create" && (
        <Section title="Upload delivery note / invoice (optional)">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-6 text-center text-sm transition-colors ${
              dragActive ? "border-slate-500 bg-slate-50" : "border-slate-300 bg-slate-50/50"
            } ${parsing ? "pointer-events-none opacity-60" : "hover:bg-slate-50"}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
            {parsing ? (
              <span className="text-slate-600">Reading PDF…</span>
            ) : parsedFromName ? (
              <span className="text-slate-700">
                ✓ Prefilled from <span className="font-medium">{parsedFromName}</span> — review and edit below, then save.
              </span>
            ) : (
              <>
                <span className="text-slate-700">Drop a PDF here, or click to upload</span>
                <span className="mt-1 text-xs text-slate-500">
                  We&apos;ll pull out supplier, date, and items so you can review them before saving.
                </span>
              </>
            )}
          </div>
          {parseError && (
            <div className="mt-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {parseError}
            </div>
          )}
          {invoiceFileUrl && !parsing && (
            <div className="mt-2 text-xs text-slate-600">
              Attached:{" "}
              <a href={invoiceFileUrl} target="_blank" rel="noreferrer" className="underline">
                view PDF
              </a>
            </div>
          )}
        </Section>
      )}

      {mode === "create" && (
        <Section title="Or paste data (from a webpage or spreadsheet)">
          <textarea
            className={`${inputCls} font-mono text-xs`}
            placeholder={
              "Paste rows here. Expected columns include Qty, Product ID, Product name, e.g.\n\nQty\tProduct ID\tProduct name\tPrice\tTotal price\n5\tWCF150\tINTERTRADE WEED CONTROL FABRIC 1M X 50M\t€16.90\t€84.50"
            }
            rows={6}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleParsePaste("replace")}
              disabled={!pasteText.trim()}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Parse → replace items
            </button>
            <button
              type="button"
              onClick={() => handleParsePaste("append")}
              disabled={!pasteText.trim()}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              Parse → append items
            </button>
            {pasteText && (
              <button
                type="button"
                onClick={() => {
                  setPasteText("");
                  setPasteWarnings([]);
                  setPasteSummary(null);
                }}
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
              >
                Clear
              </button>
            )}
          </div>
          {pasteSummary && (
            <div className="mt-2 rounded border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {pasteSummary}
            </div>
          )}
          {pasteWarnings.length > 0 && (
            <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <div className="mb-1 font-medium">Notes:</div>
              <ul className="list-disc space-y-0.5 pl-4">
                {pasteWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}

      <Section title="Supplier">
        <Field label="Supplier name" required>
          <input
            className={inputCls}
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            required
          />
        </Field>
        <Field label="Contact number">
          <input
            className={inputCls}
            value={contactNumber ?? ""}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Items">
        <div className="mb-1 hidden gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid md:grid-cols-[7rem_minmax(0,2fr)_4.5rem_minmax(0,1.5fr)_1.75rem]">
          <span>Code</span>
          <span>Item description</span>
          <span className="text-right">Qty</span>
          <span>Notes</span>
          <span aria-hidden />
        </div>
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 gap-2 md:grid-cols-[7rem_minmax(0,2fr)_4.5rem_minmax(0,1.5fr)_1.75rem] md:items-start"
            >
              <input
                className={`${inputCls} font-mono text-xs`}
                placeholder="Code (e.g. G32320)"
                value={it.code ?? ""}
                onChange={(e) => updateItem(idx, { code: e.target.value || null })}
              />
              <input
                className={inputCls}
                placeholder="Product description (e.g. Gallagher M350 mains unit)"
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
              />
              <input
                type="number"
                className={`${inputCls} text-right`}
                placeholder="Qty"
                min={0}
                step="0.01"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
              />
              <input
                className={inputCls}
                placeholder="Notes (optional)"
                value={it.notes ?? ""}
                onChange={(e) => updateItem(idx, { notes: e.target.value || null })}
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="col-span-2 rounded border border-slate-300 px-2 text-sm hover:bg-slate-100 md:col-span-1"
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
        >
          + Add item
        </button>
      </Section>

      <Section title="Dates & terms">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Order date" required>
            <input
              type="date"
              className={inputCls}
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Expected delivery">
            <input
              type="date"
              className={inputCls}
              value={expectedDelivery ?? ""}
              onChange={(e) => setExpectedDelivery(e.target.value)}
            />
          </Field>
          <Field label="Payment terms" required>
            <select
              className={inputCls}
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value as PaymentTerms)}
            >
              {PAYMENT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 border-t border-slate-200 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={paid}
              onChange={(e) => {
                const checked = e.target.checked;
                setPaid(checked);
                if (checked && !paidDate) setPaidDate(today);
              }}
            />
            <span className="font-medium text-slate-700">Already paid</span>
          </label>

          {paid && (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Paid date" required>
                <input
                  type="date"
                  className={inputCls}
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                  required={paid}
                />
              </Field>
              <Field label="Paid amount (€)">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={inputCls}
                  placeholder="0.00"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
              </Field>
            </div>
          )}

          <Field label="Payment notes">
            <textarea
              className={inputCls}
              placeholder="e.g. Paid via BACS, IBAN IE12…, cheque #1234, settle on account"
              value={paymentNotes ?? ""}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={2}
            />
          </Field>
        </div>
      </Section>

      <Section title="Notes">
        <textarea
          className={inputCls}
          value={notes ?? ""}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </Section>

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
          {saving ? "Saving…" : mode === "create" ? "Create order" : "Save changes"}
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-600">{title}</h2>
      {children}
    </section>
  );
}

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
