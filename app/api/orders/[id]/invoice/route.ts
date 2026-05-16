import { NextRequest, NextResponse } from "next/server";
import { recordInvoice } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();

  if (!body.invoice_number || typeof body.invoice_number !== "string") {
    return NextResponse.json({ error: "invoice_number required" }, { status: 400 });
  }
  const amount = Number(body.invoice_amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "invoice_amount must be a non-negative number" }, { status: 400 });
  }
  if (!body.invoice_date || typeof body.invoice_date !== "string") {
    return NextResponse.json({ error: "invoice_date required" }, { status: 400 });
  }

  const updated = await recordInvoice(Number(id), body.invoice_number, amount, body.invoice_date);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(updated);
}
