"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function RestoreOrderButton({ orderId }: { orderId: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function handle() {
    setBusy(true);
    const res = await fetch(`/api/orders/${orderId}/restore`, { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      alert("Restore failed");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy || pending}
      className="rounded border border-slate-300 bg-white px-3 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
    >
      {busy || pending ? "Restoring…" : "Restore"}
    </button>
  );
}
