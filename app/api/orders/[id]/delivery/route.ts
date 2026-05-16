import { NextRequest, NextResponse } from "next/server";
import { confirmDelivery } from "@/lib/db";
import type { OrderItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();

  if (!body.actual_delivery_date || typeof body.actual_delivery_date !== "string") {
    return NextResponse.json({ error: "actual_delivery_date required" }, { status: 400 });
  }
  if (!Array.isArray(body.delivered_items)) {
    return NextResponse.json({ error: "delivered_items must be an array" }, { status: 400 });
  }
  for (const item of body.delivered_items as OrderItem[]) {
    if (!item.name || typeof item.quantity !== "number" || item.quantity < 0) {
      return NextResponse.json({ error: "invalid delivered_items entry" }, { status: 400 });
    }
  }

  const updated = await confirmDelivery(
    Number(id),
    body.actual_delivery_date,
    body.delivered_items as OrderItem[],
  );
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}
