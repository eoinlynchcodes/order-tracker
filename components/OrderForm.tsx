"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [items, setItems] = useState<OrderItem[]>(
    initial?.items?.length ? initial.items.map((i) => ({ name: i.name, quantity: i.quantity })) : [{ name: "", quantity: 1 }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateItem(idx: number, patch: Partial<OrderItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { name: "", quantity: 1 }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanItems = items
      .map((i) => ({ name: i.name.trim(), quantity: Number(i.quantity) }))
      .filter((i) => i.name && i.quantity > 0);
    if (cleanItems.length === 0) {
      setError("Add at least one item.");
      return;
    }
    setSaving(true);
    const payload = {
      supplier_name: supplierName,
      contact_number: contactNumber || null,
      items: cleanItems,
      order_date: orderDate,
      expected_delivery_date: expectedDelivery || null,
      payment_terms: paymentTerms,
      notes: notes || null,
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
        <div className="space-y-2">
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                className={`${inputCls} flex-1`}
                placeholder="Product / item (e.g. Trallnor T100, Bark mulch m³, …)"
                value={it.name}
                onChange={(e) => updateItem(idx, { name: e.target.value })}
              />
              <input
                type="number"
                className={`${inputCls} w-24`}
                placeholder="Qty"
                min={0}
                step="0.01"
                value={it.quantity}
                onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="rounded border border-slate-300 px-2 text-sm hover:bg-slate-100"
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
