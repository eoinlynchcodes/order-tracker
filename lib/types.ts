export type PaymentTerms = "net_7" | "net_30" | "net_60" | "on_account";

export const PAYMENT_TERMS: { value: PaymentTerms; label: string; days: number | null }[] = [
  { value: "net_7", label: "Net 7", days: 7 },
  { value: "net_30", label: "Net 30", days: 30 },
  { value: "net_60", label: "Net 60", days: 60 },
  { value: "on_account", label: "On account", days: null },
];

export type OrderItem = {
  name: string;
  quantity: number;
};

export type OrderStatus =
  | "pending"
  | "delivered"
  | "invoiced"
  | "paid"
  | "overdue";

export type Order = {
  id: number;
  supplier_name: string;
  contact_number: string | null;
  delivery_address: string | null;
  items: OrderItem[];
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  delivery_confirmed_items: OrderItem[] | null;
  invoice_number: string | null;
  invoice_amount: string | null;
  invoice_date: string | null;
  invoice_url: string | null;
  invoice_file_url: string | null;
  payment_terms: PaymentTerms;
  payment_due_date: string | null;
  paid: boolean;
  paid_date: string | null;
  paid_amount: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function computeStatus(order: Order, today = new Date()): OrderStatus {
  if (order.paid) return "paid";
  if (order.invoice_number) {
    if (order.payment_due_date) {
      const due = new Date(order.payment_due_date);
      if (due < startOfDay(today)) return "overdue";
    }
    return "invoiced";
  }
  if (order.actual_delivery_date) return "delivered";
  return "pending";
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function paymentDueDate(invoiceDate: string, terms: PaymentTerms): string | null {
  const entry = PAYMENT_TERMS.find((t) => t.value === terms);
  if (!entry || entry.days === null) return null;
  const d = new Date(invoiceDate);
  d.setDate(d.getDate() + entry.days);
  return d.toISOString().slice(0, 10);
}
