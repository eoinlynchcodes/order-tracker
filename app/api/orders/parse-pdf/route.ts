import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_order",
  description:
    "Extract supplier order details from the supplied delivery note or invoice PDF.",
  input_schema: {
    type: "object",
    properties: {
      supplier_name: {
        type: "string",
        description:
          "Name of the supplier — the company on the document's letterhead. NOT the buyer (Mick Lynch Timber and Bark Mulch Ltd).",
      },
      contact_number: {
        type: ["string", "null"],
        description:
          "Supplier phone number, formatted as shown on the document (e.g. '021 4312281'). Null if none.",
      },
      order_date: {
        type: "string",
        description:
          "Date on the document in YYYY-MM-DD format. Convert DD/MM/YYYY → YYYY-MM-DD.",
      },
      payment_terms: {
        type: ["string", "null"],
        enum: ["prepaid", "net_7", "net_30", "net_60", "on_account", null],
        description:
          "Inferred payment terms IF the document explicitly states them. Mapping: 'Prepaid'/'Pro-forma'/'Payment before delivery'/'Payment with order'/'COD'/'Cash on delivery'/'Pay on collection' → prepaid; 'Payment within 7 days'/'Net 7' → net_7; 'Net 30'/'30 days' → net_30; 'Net 60'/'60 days' → net_60; 'On account'/'Account customer' → on_account. Null if the document doesn't specify payment terms. Do NOT infer from generic phrases like 'Discrepancies to be reported within 30 days' — that's a returns window, not payment terms.",
      },
      payment_notes: {
        type: ["string", "null"],
        description:
          "Any payment-related instructions on the document — e.g. bank/IBAN details, 'cheques payable to X', 'pay by BACS to ...', early-settlement discounts. Concise plain text. Null if no payment instructions are present.",
      },
      items: {
        type: "array",
        description: "Line items from the order/delivery table. One entry per row.",
        items: {
          type: "object",
          properties: {
            code: {
              type: ["string", "null"],
              description:
                "Product / SKU code shown in its own column (e.g. 'G32320', '008711', '5300570', 'DC9', 'PLIERS'). Null if the row has no code column.",
            },
            name: {
              type: "string",
              description:
                "Product description ONLY, WITHOUT the code prefix. e.g. 'GALLAGHER M350 MAINS UNIT' — NOT 'G32320 GALLAGHER M350 MAINS UNIT'. The code goes in the code field, not here.",
            },
            quantity: {
              type: "number",
              description:
                "Order quantity from the quantity column. Always a positive number. NOT unit price, NOT net amount.",
            },
          },
          required: ["name", "quantity"],
        },
      },
    },
    required: ["supplier_name", "order_date", "items"],
  },
};

const SYSTEM_PROMPT =
  "You extract structured purchase-order data from supplier delivery notes and invoices for a landscaping-supplies business based in Ireland. The business (Mick Lynch Timber and Bark Mulch Ltd) is the BUYER. The 'supplier' is the company that issued the document — usually shown on the letterhead at the top. Always call the extract_order tool.\n\nDates must be YYYY-MM-DD; convert DD/MM/YYYY accordingly.\n\nFor each line item, SPLIT the row into THREE separate fields:\n• code → the product/SKU code (e.g. 'G32320', 'DC9', '008711', 'PLIERS'). Null if no code column.\n• name → the human-readable description WITHOUT the code (e.g. 'GALLAGHER M350 MAINS UNIT').\n• quantity → the number from the quantity column.\n\nDo NOT concatenate the code into the name. Do NOT put the quantity into the name. Each field is its own value.";

type ParsedOrder = {
  supplier_name: string;
  contact_number: string | null;
  order_date: string;
  payment_terms: "prepaid" | "net_7" | "net_30" | "net_60" | "on_account" | null;
  payment_notes: string | null;
  items: { name: string; quantity: number; code?: string | null }[];
};

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file required (multipart form field 'file')" },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MAX_SIZE_BYTES / 1024 / 1024}MB)` },
      { status: 400 },
    );
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: `only PDF supported (got ${file.type})` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  const blobPromise = put(
    `delivery-notes/${Date.now()}-${file.name}`,
    buf,
    { access: "public", contentType: "application/pdf", addRandomSuffix: true },
  );

  const anthropic = new Anthropic();
  const llmPromise = anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    ],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: "tool", name: "extract_order" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: "Extract the supplier, date, and line items from this document.",
          },
        ],
      },
    ],
  });

  let blob: { url: string } | null = null;
  let msg: Anthropic.Message;
  try {
    [blob, msg] = await Promise.all([blobPromise, llmPromise]);
  } catch (e) {
    console.error("parse-pdf failure", e);
    const message = e instanceof Error ? e.message : "parse failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const toolUse = msg.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) {
    return NextResponse.json(
      { error: "Model did not return structured data" },
      { status: 502 },
    );
  }
  const parsed = toolUse.input as ParsedOrder;

  const allowedTerms = new Set(["prepaid", "net_7", "net_30", "net_60", "on_account"]);
  const payment_terms =
    parsed.payment_terms && allowedTerms.has(parsed.payment_terms)
      ? parsed.payment_terms
      : null;

  return NextResponse.json({
    parsed: {
      supplier_name: parsed.supplier_name ?? "",
      contact_number: parsed.contact_number ?? null,
      order_date: parsed.order_date ?? "",
      payment_terms,
      payment_notes: parsed.payment_notes ?? null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    },
    file_url: blob.url,
  });
}
