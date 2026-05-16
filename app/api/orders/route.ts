import { NextRequest, NextResponse } from "next/server";
import { createOrder, listOrders } from "@/lib/db";
import type { OrderItem, PaymentTerms } from "@/lib/types";
import { PAYMENT_TERMS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orders = await listOrders();
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const err = validate(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const order = await createOrder({
    supplier_name: String(body.supplier_name).trim(),
    contact_number: body.contact_number ? String(body.contact_number).trim() : null,
    delivery_address: body.delivery_address ? String(body.delivery_address).trim() : null,
    items: body.items as OrderItem[],
    order_date: String(body.order_date),
    expected_delivery_date: body.expected_delivery_date || null,
    payment_terms: body.payment_terms as PaymentTerms,
    notes: body.notes ? String(body.notes) : null,
  });
  return NextResponse.json(order, { status: 201 });
}

function validate(body: Record<string, unknown>): string | null {
  if (!body.supplier_name || typeof body.supplier_name !== "string") return "supplier_name required";
  if (!body.order_date || typeof body.order_date !== "string") return "order_date required";
  if (!Array.isArray(body.items) || body.items.length === 0) return "items required (non-empty array)";
  for (const item of body.items as OrderItem[]) {
    if (!item.name || typeof item.name !== "string") return "each item needs a name";
    if (typeof item.quantity !== "number" || item.quantity <= 0) return "each item needs a positive quantity";
  }
  if (!PAYMENT_TERMS.some((t) => t.value === body.payment_terms)) return "invalid payment_terms";
  return null;
}
