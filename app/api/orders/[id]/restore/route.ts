import { NextRequest, NextResponse } from "next/server";
import { restoreOrder } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = await restoreOrder(Number(id));
  if (!ok) return NextResponse.json({ error: "not found or not deleted" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
