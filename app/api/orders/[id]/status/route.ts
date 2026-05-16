import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { clearPayment, getOrder, markDelivered, recordPayment } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const target = String(body.status);
  const today = new Date().toISOString().slice(0, 10);

  const order = await getOrder(Number(id));
  if (!order) return NextResponse.json({ error: "not found" }, { status: 404 });

  switch (target) {
    case "pending": {
      await sql`UPDATE orders SET actual_delivery_date = NULL, paid = FALSE, paid_date = NULL, paid_amount = NULL, updated_at = NOW() WHERE id = ${order.id}`;
      return NextResponse.json({ ok: true });
    }
    case "delivered": {
      const updated = await markDelivered(order.id, order.actual_delivery_date ?? today);
      if (order.paid) await clearPayment(order.id);
      return NextResponse.json(updated);
    }
    case "paid": {
      if (!order.invoice_number) {
        return NextResponse.json(
          { error: "Add an invoice before marking paid" },
          { status: 400 },
        );
      }
      const amt = order.invoice_amount ? Number(order.invoice_amount) : 0;
      const updated = await recordPayment(
        order.id,
        order.paid_date ?? today,
        order.paid_amount ? Number(order.paid_amount) : amt,
      );
      return NextResponse.json(updated);
    }
    case "unpaid": {
      const updated = await clearPayment(order.id);
      return NextResponse.json(updated);
    }
    default:
      return NextResponse.json({ error: `unknown status: ${target}` }, { status: 400 });
  }
}
