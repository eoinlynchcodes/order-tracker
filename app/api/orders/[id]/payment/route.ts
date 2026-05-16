import { NextRequest, NextResponse } from "next/server";
import { clearPayment, recordPayment } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();

  if (!body.paid_date || typeof body.paid_date !== "string") {
    return NextResponse.json({ error: "paid_date required" }, { status: 400 });
  }
  const amount = Number(body.paid_amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "paid_amount must be a non-negative number" }, { status: 400 });
  }

  const updated = await recordPayment(Number(id), body.paid_date, amount);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const updated = await clearPayment(Number(id));
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}
