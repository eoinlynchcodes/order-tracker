"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { OrderItem } from "@/lib/types";

type RowStatus = "unchecked" | "exact" | "short" | "over";

type Row = {
  name: string;
  ordered: number; // 0 if added as an extra item not in original order
  received: number | null; // null = not yet checked
  extra: boolean; // true if added during check-in (not in original order)
};

function rowStatus(r: Row): RowStatus {
  if (r.received == null) return "unchecked";
  if (r.received === r.ordered) return "exact";
  if (r.received < r.ordered) return "short";
  return "over";
}

export function DeliveryForm({
  orderId,
  ordered,
  previouslyConfirmed,
}: {
  orderId: number;
  ordered: OrderItem[];
  previouslyConfirmed: OrderItem[] | null;
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<Row[]>(() => {
    // Build initial state: every ordered item, plus any "extras" previously checked in
    const confirmedByName = new Map(
      (previouslyConfirmed ?? []).map((c) => [c.name, c.quantity]),
    );
    const base: Row[] = ordered.map((o) => ({
      name: o.name,
      ordered: o.quantity,
      received: confirmedByName.has(o.name) ? confirmedByName.get(o.name)! : null,
      extra: false,
    }));
    if (previouslyConfirmed) {
      const orderedNames = new Set(ordered.map((o) => o.name));
      for (const c of previouslyConfirmed) {
        if (!orderedNames.has(c.name)) {
          base.push({ name: c.name, ordered: 0, received: c.quantity, extra: true });
        }
      }
    }
    return base;
  });

  // Inline edit state for "adjust quantity"
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  // State for "add extra item" form
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraName, setExtraName] = useState("");
  const [extraQty, setExtraQty] = useState<number>(1);

  const progress = useMemo(() => {
    const total = rows.length;
    const done = rows.filter((r) => r.received != null).length;
    const mismatches = rows.filter(
      (r) => r.received != null && r.received !== r.ordered && !r.extra,
    ).length;
    return { total, done, mismatches };
  }, [rows]);

  function markReceived(idx: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, received: r.ordered } : r)),
    );
  }

  function setReceivedQty(idx: number, qty: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, received: qty } : r)),
    );
  }

  function clearReceived(idx: number) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, received: null } : r)),
    );
  }

  function addExtra() {
    const name = extraName.trim();
    const qty = Number(extraQty);
    if (!name || !Number.isFinite(qty) || qty <= 0) return;
    setRows((prev) => [...prev, { name, ordered: 0, received: qty, extra: true }]);
    setExtraName("");
    setExtraQty(1);
    setShowAddExtra(false);
  }

  function removeExtra(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Only items with a received qty get sent; unchecked items are treated as not received
    const delivered_items = rows
      .filter((r) => r.received != null)
      .map((r) => ({ name: r.name, quantity: Number(r.received) }));
    if (delivered_items.length === 0) {
      setError("Mark at least one item as received before saving.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/orders/${orderId}/delivery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actual_delivery_date: date,
        delivered_items,
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
      {/* Header / progress */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 md:flex-row md:items-end md:justify-between">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Delivery date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            required
          />
        </label>
        <div className="text-sm">
          <div className="font-medium">
            {progress.done} of {progress.total} checked in
          </div>
          {progress.mismatches > 0 && (
            <div className="text-xs text-amber-700">
              {progress.mismatches} mismatch{progress.mismatches > 1 ? "es" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Item cards */}
      <div className="space-y-2">
        {rows.map((r, idx) => {
          const status = rowStatus(r);
          const isEditing = editingIdx === idx;
          return (
            <div
              key={`${r.name}-${idx}`}
              className={`rounded-lg border-l-4 bg-white p-4 transition ${borderForStatus(status)}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-medium">{r.name}</span>
                    {r.extra && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-800">
                        unexpected
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-slate-600">
                    {r.extra ? (
                      <>Not ordered — received <strong>{r.received}</strong></>
                    ) : (
                      <>
                        Ordered: <strong>{r.ordered}</strong>
                        {r.received != null && (
                          <>
                            {" "}· Received: <strong>{r.received}</strong>
                            {status === "short" && (
                              <span className="ml-2 text-amber-700">
                                short by {r.ordered - r.received}
                              </span>
                            )}
                            {status === "over" && (
                              <span className="ml-2 text-amber-700">
                                over by {r.received - r.ordered}
                              </span>
                            )}
                            {status === "exact" && (
                              <span className="ml-2 text-emerald-700">✓ as ordered</span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <label className="flex items-center gap-1 text-xs text-slate-600">
                        Qty
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={r.received ?? 0}
                          onChange={(e) => setReceivedQty(idx, Number(e.target.value))}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                          autoFocus
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setEditingIdx(null)}
                        className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
                      >
                        Done
                      </button>
                    </>
                  ) : status === "unchecked" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => markReceived(idx)}
                        className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                      >
                        ✓ Received
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReceivedQty(idx, 0);
                          setEditingIdx(idx);
                        }}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
                      >
                        Different qty…
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditingIdx(idx)}
                        className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
                      >
                        Adjust
                      </button>
                      {r.extra ? (
                        <button
                          type="button"
                          onClick={() => removeExtra(idx)}
                          className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => clearReceived(idx)}
                          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                          title="Mark as not yet checked"
                        >
                          Uncheck
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add extra item */}
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4">
        {showAddExtra ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[180px]">
              <span className="mb-1 block text-xs font-medium text-slate-700">Item name</span>
              <input
                value={extraName}
                onChange={(e) => setExtraName(e.target.value)}
                className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Qty</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={extraQty}
                onChange={(e) => setExtraQty(Number(e.target.value))}
                className="w-24 rounded border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={addExtra}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-800"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddExtra(false);
                setExtraName("");
                setExtraQty(1);
              }}
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddExtra(true)}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            + Add an unexpected item (something delivered that wasn&apos;t ordered)
          </button>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="sticky bottom-2 flex gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save check-in"}
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

function borderForStatus(s: RowStatus): string {
  switch (s) {
    case "exact":
      return "border-emerald-500 shadow-sm";
    case "short":
    case "over":
      return "border-amber-500 shadow-sm";
    case "unchecked":
    default:
      return "border-slate-200";
  }
}
