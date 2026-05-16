"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function PurgeOrderButton({
  orderId,
  supplierName,
}: {
  orderId: number;
  supplierName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handle() {
    const ok = confirm(
      `Permanently delete order #${orderId} (${supplierName})?\n\n` +
        "This cannot be undone. The invoice file (if any) will also be removed.",
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}?hard=true`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      alert("Delete failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy || pending}
      className="rounded border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {busy || pending ? "Deleting…" : "Delete forever"}
    </button>
  );
}
