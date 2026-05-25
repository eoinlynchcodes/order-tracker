import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
]);
// HEIC isn't supported by Claude's image input; everything else is parseable.
const PARSEABLE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_invoice",
  description: "Extract key fields from a supplier invoice.",
  input_schema: {
    type: "object",
    properties: {
      invoice_number: {
        type: ["string", "null"],
        description:
          "Invoice number / reference shown on the document (e.g. '112822'). Look for labels like 'Invoice No.', 'Invoice #', 'Invoice Number'. Null if no clear invoice number on the page.",
      },
      invoice_amount: {
        type: ["number", "null"],
        description:
          "INVOICE TOTAL — the grand total the customer owes, INCLUDING VAT/tax (e.g. 2159.06). Look for 'Invoice Total', 'Grand Total', 'Total Due', 'Amount Due'. NOT the net subtotal, NOT the VAT amount alone. Return a plain number — no currency symbol, no thousands separators.",
      },
      invoice_date: {
        type: ["string", "null"],
        description:
          "Invoice date in YYYY-MM-DD format. Convert DD/MM/YYYY → YYYY-MM-DD. Use the value labeled 'Invoice Date' / 'Tax Date' / 'Invoice/Tax Date'. Null if no date is shown.",
      },
    },
    required: ["invoice_number", "invoice_amount", "invoice_date"],
  },
};

const SYSTEM_PROMPT = `You extract structured data from supplier invoices for a landscaping-supplies business based in Ireland (Mick Lynch Timber and Bark Mulch Ltd). The business is the BUYER. Always call the extract_invoice tool.

CRITICAL FIELD MAPPING — do not confuse these:
• invoice_number → the value labeled "Invoice No.", "Invoice #", or "Invoice Number". This identifies THIS invoice document.
• Do NOT use "Cust. Order No.", "Customer Order No.", "Account No.", "PO No.", or "Delivery Note No." for invoice_number. Those are different fields.
• invoice_amount → the GRAND TOTAL the buyer owes, INCLUDING VAT. Labels: "Invoice Total", "Grand Total", "Total Due", "Amount Due", "Total Inc VAT". Pick the largest total at the bottom of the totals box. NEVER use "Total Net Amount" (that excludes VAT), "Total VAT Amount" (that's VAT alone), or a per-line "Net" amount.
• invoice_date → the value labeled "Invoice Date", "Invoice/Tax Date", or "Tax Date". Convert DD/MM/YYYY → YYYY-MM-DD.

Amount must be a plain JSON number — no currency symbol, no thousands separator (e.g. 2159.06, not "€2,159.06" and not "2,159.06").`;

type ParsedInvoice = {
  invoice_number: string | null;
  invoice_amount: number | null;
  invoice_date: string | null;
};

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;

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
  if (!UPLOAD_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `unsupported content-type: ${file.type}` },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");

  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const blobPromise = put(`invoices/order-${id}-${Date.now()}${ext}`, buf, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: true,
  });

  // Parse PDFs and standard image types; skip HEIC (Claude image input doesn't accept it).
  const parseable =
    file.type === "application/pdf" || PARSEABLE_IMAGE_TYPES.has(file.type);

  let parsed: ParsedInvoice | null = null;
  if (parseable) {
    try {
      const anthropic = new Anthropic();
      const contentBlock: Anthropic.ContentBlockParam =
        file.type === "application/pdf"
          ? {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: base64 },
            }
          : {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/png" | "image/jpeg" | "image/webp",
                data: base64,
              },
            };

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tools: [EXTRACT_TOOL],
        tool_choice: { type: "tool", name: "extract_invoice" },
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: "Extract the invoice number, grand total amount (including VAT), and invoice date.",
              },
            ],
          },
        ],
      });

      const toolUse = msg.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      if (toolUse) {
        const raw = toolUse.input as Record<string, unknown>;
        console.log("invoice parse raw input", JSON.stringify(raw));

        // invoice_amount: accept number, or string like "2,159.06" / "€2,159.06"
        let amt: number | null = null;
        const rawAmount = raw.invoice_amount;
        if (typeof rawAmount === "number" && Number.isFinite(rawAmount)) {
          amt = rawAmount;
        } else if (typeof rawAmount === "string") {
          const cleaned = rawAmount.replace(/[^0-9.\-]/g, "");
          const n = parseFloat(cleaned);
          if (Number.isFinite(n)) amt = n;
        }

        const rawDate = raw.invoice_date;
        const date =
          typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
            ? rawDate
            : null;

        const rawNum = raw.invoice_number;
        const num =
          rawNum != null && String(rawNum).trim() !== ""
            ? String(rawNum).trim()
            : null;

        parsed = {
          invoice_number: num,
          invoice_amount: amt,
          invoice_date: date,
        };
        console.log("invoice parse normalized", JSON.stringify(parsed));
      }
    } catch (e) {
      // Parsing failure shouldn't block the file upload — log and continue.
      console.error("invoice parse failed", e);
    }
  }

  let blob;
  try {
    blob = await blobPromise;
  } catch (e) {
    console.error("invoice blob upload failed", e);
    const message = e instanceof Error ? e.message : "blob upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ file_url: blob.url, parsed });
}
