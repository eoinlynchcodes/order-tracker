import { sql } from "@vercel/postgres";
import type { Order, OrderItem, PaymentTerms } from "./types";
import { paymentDueDate } from "./types";

export type CreateOrderInput = {
  customer_name: string;
  contact_number?: string | null;
  delivery_address: string;
  items: OrderItem[];
  order_date: string;
  expected_delivery_date?: string | null;
  payment_terms: PaymentTerms;
  notes?: string | null;
};

export type UpdateOrderInput = Partial<CreateOrderInput>;

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: Number(row.id),
    customer_name: String(row.customer_name),
    contact_number: (row.contact_number as string | null) ?? null,
    delivery_address: String(row.delivery_address),
    items: (row.items as OrderItem[]) ?? [],
    order_date: row.order_date ? toDateStr(row.order_date) : "",
    expected_delivery_date: row.expected_delivery_date ? toDateStr(row.expected_delivery_date) : null,
    actual_delivery_date: row.actual_delivery_date ? toDateStr(row.actual_delivery_date) : null,
    delivery_confirmed_items: (row.delivery_confirmed_items as OrderItem[] | null) ?? null,
    invoice_number: (row.invoice_number as string | null) ?? null,
    invoice_amount: row.invoice_amount != null ? String(row.invoice_amount) : null,
    invoice_date: row.invoice_date ? toDateStr(row.invoice_date) : null,
    payment_terms: (row.payment_terms as PaymentTerms) ?? "net_30",
    payment_due_date: row.payment_due_date ? toDateStr(row.payment_due_date) : null,
    paid: Boolean(row.paid),
    paid_date: row.paid_date ? toDateStr(row.paid_date) : null,
    paid_amount: row.paid_amount != null ? String(row.paid_amount) : null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v);
  return s.slice(0, 10);
}

export async function listOrders(): Promise<Order[]> {
  const { rows } = await sql`SELECT * FROM orders ORDER BY order_date DESC, id DESC`;
  return rows.map(rowToOrder);
}

export async function getOrder(id: number): Promise<Order | null> {
  const { rows } = await sql`SELECT * FROM orders WHERE id = ${id} LIMIT 1`;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const { rows } = await sql`
    INSERT INTO orders (
      customer_name, contact_number, delivery_address, items,
      order_date, expected_delivery_date, payment_terms, notes
    ) VALUES (
      ${input.customer_name},
      ${input.contact_number ?? null},
      ${input.delivery_address},
      ${JSON.stringify(input.items)}::jsonb,
      ${input.order_date},
      ${input.expected_delivery_date ?? null},
      ${input.payment_terms},
      ${input.notes ?? null}
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
      customer_name = ${merged.customer_name},
      contact_number = ${merged.contact_number ?? null},
      delivery_address = ${merged.delivery_address},
      items = ${JSON.stringify(merged.items)}::jsonb,
      order_date = ${merged.order_date},
      expected_delivery_date = ${merged.expected_delivery_date ?? null},
      payment_terms = ${merged.payment_terms},
      notes = ${merged.notes ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function deleteOrder(id: number): Promise<boolean> {
  const { rowCount } = await sql`DELETE FROM orders WHERE id = ${id}`;
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

export async function recordInvoice(
  id: number,
  invoice_number: string,
  invoice_amount: number,
  invoice_date: string,
): Promise<Order | null> {
  const existing = await getOrder(id);
  if (!existing) return null;
  const due = paymentDueDate(invoice_date, existing.payment_terms);
  const { rows } = await sql`
    UPDATE orders SET
      invoice_number = ${invoice_number},
      invoice_amount = ${invoice_amount},
      invoice_date = ${invoice_date},
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
