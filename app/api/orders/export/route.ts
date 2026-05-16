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
    "customer_name",
    "contact_number",
    "delivery_address",
    "items",
    "order_date",
    "expected_delivery_date",
    "actual_delivery_date",
    "invoice_number",
    "invoice_amount",
    "invoice_date",
    "payment_terms",
    "payment_due_date",
    "paid",
    "paid_date",
    "paid_amount",
    "notes",
  ];

  const lines = [headers.join(",")];
  for (const o of orders) {
    const itemsStr = o.items.map((i) => `${i.quantity}x ${i.name}${i.unit ? " " + i.unit : ""}`).join("; ");
    const row = [
      o.id,
      computeStatus(o),
      o.customer_name,
      o.contact_number ?? "",
      o.delivery_address,
      itemsStr,
      o.order_date,
      o.expected_delivery_date ?? "",
      o.actual_delivery_date ?? "",
      o.invoice_number ?? "",
      o.invoice_amount ?? "",
      o.invoice_date ?? "",
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
