import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, getOrder, updateOrder } from "@/lib/db";
import type { OrderItem, PaymentTerms } from "@/lib/types";
import { PAYMENT_TERMS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();

  if (body.payment_terms && !PAYMENT_TERMS.some((t) => t.value === body.payment_terms)) {
    return NextResponse.json({ error: "invalid payment_terms" }, { status: 400 });
  }
  if (body.items && !Array.isArray(body.items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  const updated = await updateOrder(Number(id), {
    customer_name: body.customer_name,
    contact_number: body.contact_number ?? null,
    delivery_address: body.delivery_address,
    items: body.items as OrderItem[] | undefined,
    order_date: body.order_date,
    expected_delivery_date: body.expected_delivery_date ?? null,
    payment_terms: body.payment_terms as PaymentTerms | undefined,
    notes: body.notes ?? null,
  });
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteOrder(Number(id));
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
