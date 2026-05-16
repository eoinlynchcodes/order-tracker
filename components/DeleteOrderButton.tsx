"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteOrderButton({ orderId, supplierName }: { orderId: number; supplierName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!confirm(`Move order #${orderId} (${supplierName}) to deleted? You can restore it later.`)) return;
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(false);
      alert("Delete failed");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={busy}
      className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
