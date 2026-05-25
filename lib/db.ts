import { sql } from "@vercel/postgres";
import type { Order, OrderItem, PaymentTerms } from "./types";
import { paymentDueDate } from "./types";

export type CreateOrderInput = {
  supplier_name: string;
  contact_number?: string | null;
  delivery_address?: string | null;
  items: OrderItem[];
  order_date: string;
  expected_delivery_date?: string | null;
  payment_terms: PaymentTerms;
  notes?: string | null;
  invoice_file_url?: string | null;
  paid?: boolean;
  paid_date?: string | null;
  paid_amount?: number | null;
  payment_notes?: string | null;
};

export type UpdateOrderInput = Partial<CreateOrderInput>;

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: Number(row.id),
    supplier_name: String(row.supplier_name),
    contact_number: (row.contact_number as string | null) ?? null,
    delivery_address: (row.delivery_address as string | null) ?? null,
    items: (row.items as OrderItem[]) ?? [],
    order_date: row.order_date ? toDateStr(row.order_date) : "",
    expected_delivery_date: row.expected_delivery_date ? toDateStr(row.expected_delivery_date) : null,
    actual_delivery_date: row.actual_delivery_date ? toDateStr(row.actual_delivery_date) : null,
    delivery_confirmed_items: (row.delivery_confirmed_items as OrderItem[] | null) ?? null,
    invoice_number: (row.invoice_number as string | null) ?? null,
    invoice_amount: row.invoice_amount != null ? String(row.invoice_amount) : null,
    invoice_date: row.invoice_date ? toDateStr(row.invoice_date) : null,
    invoice_url: (row.invoice_url as string | null) ?? null,
    invoice_file_url: (row.invoice_file_url as string | null) ?? null,
    payment_terms: (row.payment_terms as PaymentTerms) ?? "net_30",
    payment_due_date: row.payment_due_date ? toDateStr(row.payment_due_date) : null,
    paid: Boolean(row.paid),
    paid_date: row.paid_date ? toDateStr(row.paid_date) : null,
    paid_amount: row.paid_amount != null ? String(row.paid_amount) : null,
    payment_notes: (row.payment_notes as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    deleted_at: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
}

export async function listOrders(): Promise<Order[]> {
  const { rows } = await sql`
    SELECT * FROM orders WHERE deleted_at IS NULL
    ORDER BY order_date DESC, id DESC
  `;
  return rows.map(rowToOrder);
}

export async function listDeletedOrders(): Promise<Order[]> {
  const { rows } = await sql`
    SELECT * FROM orders WHERE deleted_at IS NOT NULL
    ORDER BY deleted_at DESC
  `;
  return rows.map(rowToOrder);
}

export async function countDeletedOrders(): Promise<number> {
  const { rows } = await sql`SELECT COUNT(*)::int AS n FROM orders WHERE deleted_at IS NOT NULL`;
  return Number(rows[0]?.n ?? 0);
}

export async function getOrder(id: number): Promise<Order | null> {
  const { rows } = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const paid = Boolean(input.paid);
  const paid_date = paid ? input.paid_date ?? null : null;
  const paid_amount = paid ? input.paid_amount ?? null : null;
  const { rows } = await sql`
    INSERT INTO orders (
      supplier_name, contact_number, delivery_address, items,
      order_date, expected_delivery_date, payment_terms, notes,
      invoice_file_url,
      paid, paid_date, paid_amount, payment_notes
    ) VALUES (
      ${input.supplier_name},
      ${input.contact_number ?? null},
      ${input.delivery_address ?? null},
      ${JSON.stringify(input.items)}::jsonb,
      ${input.order_date},
      ${input.expected_delivery_date ?? null},
      ${input.payment_terms},
      ${input.notes ?? null},
      ${input.invoice_file_url ?? null},
      ${paid},
      ${paid_date},
      ${paid_amount},
      ${input.payment_notes ?? null}
    )
    RETURNING *
  `;
  return rowToOrder(rows[0]);
}

export async function updateOrder(id: number, input: UpdateOrderInput): Promise<Order | null> {
  const existing = await getOrder(id);
  if (!existing) return null;
  const merged = { ...existing, ...input };
  const { rows } = await sql`
    UPDATE orders SET
      supplier_name = ${merged.supplier_name},
      contact_number = ${merged.contact_number ?? null},
      delivery_address = ${merged.delivery_address ?? null},
      items = ${JSON.stringify(merged.items)}::jsonb,
      order_date = ${merged.order_date},
      expected_delivery_date = ${merged.expected_delivery_date ?? null},
      payment_terms = ${merged.payment_terms},
      notes = ${merged.notes ?? null},
      payment_notes = ${merged.payment_notes ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function updateNotes(id: number, notes: string | null): Promise<Order | null> {
  const { rows } = await sql`
    UPDATE orders SET notes = ${notes}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function hardDeleteOrder(id: number): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM orders WHERE id = ${id}`;
  return (rowCount ?? 0) > 0;
}

export async function softDeleteOrder(id: number): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE orders SET deleted_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NULL
  `;
  return (rowCount ?? 0) > 0;
}

export async function restoreOrder(id: number): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE orders SET deleted_at = NULL, updated_at = NOW()
    WHERE id = ${id} AND deleted_at IS NOT NULL
  `;
  return (rowCount ?? 0) > 0;
}

export async function confirmDelivery(
  id: number,
  actual_delivery_date: string,
  delivery_confirmed_items: OrderItem[],
): Promise<Order | null> {
  const { rows } = await sql`
    UPDATE orders SET
      actual_delivery_date = ${actual_delivery_date},
      delivery_confirmed_items = ${JSON.stringify(delivery_confirmed_items)}::jsonb,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function markDelivered(id: number, date: string): Promise<Order | null> {
  const { rows } = await sql`
    UPDATE orders SET actual_delivery_date = ${date}, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function recordInvoice(
  id: number,
  invoice_number: string,
  invoice_amount: number,
  invoice_date: string,
  invoice_url?: string | null,
  invoice_file_url?: string | null,
): Promise<Order | null> {
  const existing = await getOrder(id);
  if (!existing) return null;
  const due = paymentDueDate(invoice_date, existing.payment_terms);
  const { rows } = await sql`
    UPDATE orders SET
      invoice_number = ${invoice_number},
      invoice_amount = ${invoice_amount},
      invoice_date = ${invoice_date},
      invoice_url = ${invoice_url ?? null},
      invoice_file_url = ${invoice_file_url ?? null},
      payment_due_date = ${due},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function recordPayment(
  id: number,
  paid_date: string,
  paid_amount: number,
): Promise<Order | null> {
  const { rows } = await sql`
    UPDATE orders SET
      paid = TRUE,
      paid_date = ${paid_date},
      paid_amount = ${paid_amount},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function clearPayment(id: number): Promise<Order | null> {
  const { rows } = await sql`
    UPDATE orders SET paid = FALSE, paid_date = NULL, paid_amount = NULL, updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}
