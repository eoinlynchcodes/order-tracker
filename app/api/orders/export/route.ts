import { NextResponse } from "next/server";
import { listOrders } from "@/lib/db";
import { computeStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await listOrders();

  const headers = [
    "id",
    "status",
    "supplier_name",
    "contact_number",
    "items",
    "order_date",
    "expected_delivery_date",
    "actual_delivery_date",
    "invoice_number",
    "invoice_amount",
    "invoice_date",
    "invoice_url",
    "invoice_file_url",
    "payment_terms",
    "payment_due_date",
    "paid",
    "paid_date",
    "paid_amount",
    "notes",
  ];

  const lines = [headers.join(",")];
  for (const o of orders) {
    const itemsStr = o.items
      .map(
        (i) =>
          `${i.quantity}x ${i.code ? `[${i.code}] ` : ""}${i.name}${i.notes ? ` (${i.notes})` : ""}`,
      )
      .join("; ");
    const row = [
      o.id,
      computeStatus(o),
      o.supplier_name,
      o.contact_number ?? "",
      itemsStr,
      o.order_date,
      o.expected_delivery_date ?? "",
      o.actual_delivery_date ?? "",
      o.invoice_number ?? "",
      o.invoice_amount ?? "",
      o.invoice_date ?? "",
      o.invoice_url ?? "",
      o.invoice_file_url ?? "",
      o.payment_terms,
      o.payment_due_date ?? "",
      o.paid ? "yes" : "no",
      o.paid_date ?? "",
      o.paid_amount ?? "",
      o.notes ?? "",
    ];
    lines.push(row.map(csvEscape).join(","));
  }

  const csv = lines.join("\n");
  const filename = `orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
