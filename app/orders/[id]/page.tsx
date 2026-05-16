import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { computeStatus, PAYMENT_TERMS } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();

  const status = computeStatus(order);
  const termsLabel = PAYMENT_TERMS.find((t) => t.value === order.payment_terms)?.label ?? order.payment_terms;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:underline">← Back</Link>
          <h1 className="mt-1 text-2xl font-semibold">
            Order #{order.id} <StatusBadge status={status} />
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/orders/${order.id}/edit`}
            className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100"
          >
            Edit
          </Link>
          {!order.actual_delivery_date && (
            <Link
              href={`/orders/${order.id}/delivery`}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Confirm delivery
            </Link>
          )}
          {order.actual_delivery_date && !order.invoice_number && (
            <Link
              href={`/orders/${order.id}/invoice`}
              className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-700"
            >
              Add invoice
            </Link>
          )}
          {order.invoice_number && !order.paid && (
            <Link
              href={`/orders/${order.id}/payment`}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-700"
            >
              Record payment
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Customer">
          <Row label="Name">{order.customer_name}</Row>
          <Row label="Contact">{order.contact_number ?? "—"}</Row>
          <Row label="Delivery address">{order.delivery_address}</Row>
        </Card>

        <Card title="Schedule">
          <Row label="Order date">{order.order_date}</Row>
          <Row label="Expected delivery">{order.expected_delivery_date ?? "—"}</Row>
          <Row label="Actual delivery">{order.actual_delivery_date ?? "—"}</Row>
        </Card>

        <Card title="Items ordered">
          <ItemTable items={order.items} />
        </Card>

        <Card title="Items delivered">
          {order.delivery_confirmed_items ? (
            <DeliveryComparison
              ordered={order.items}
              delivered={order.delivery_confirmed_items}
            />
          ) : (
            <p className="text-sm text-slate-500">Delivery not yet confirmed.</p>
          )}
        </Card>

        <Card title="Invoice">
          <Row label="Invoice #">{order.invoice_number ?? "—"}</Row>
          <Row label="Amount">{order.invoice_amount ? `$${order.invoice_amount}` : "—"}</Row>
          <Row label="Invoice date">{order.invoice_date ?? "—"}</Row>
          <Row label="Payment terms">{termsLabel}</Row>
          <Row label="Payment due">
            <span className={status === "overdue" ? "font-semibold text-red-700" : ""}>
              {order.payment_due_date ?? "—"}
            </span>
          </Row>
        </Card>

        <Card title="Payment">
          <Row label="Paid">{order.paid ? "Yes" : "No"}</Row>
          <Row label="Paid date">{order.paid_date ?? "—"}</Row>
          <Row label="Paid amount">{order.paid_amount ? `$${order.paid_amount}` : "—"}</Row>
        </Card>

        {order.notes && (
          <Card title="Notes">
            <p className="whitespace-pre-wrap text-sm">{order.notes}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-600">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2 grid grid-cols-3 gap-2 text-sm last:mb-0">
      <div className="text-slate-500">{label}</div>
      <div className="col-span-2">{children}</div>
    </div>
  );
}

function ItemTable({ items }: { items: { name: string; quantity: number; unit?: string }[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-slate-500">
        <tr>
          <th className="py-1">Item</th>
          <th className="py-1 text-right">Qty</th>
          <th className="py-1">Unit</th>
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="py-1">{it.name}</td>
            <td className="py-1 text-right">{it.quantity}</td>
            <td className="py-1 text-slate-500">{it.unit ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DeliveryComparison({
  ordered,
  delivered,
}: {
  ordered: { name: string; quantity: number; unit?: string }[];
  delivered: { name: string; quantity: number; unit?: string }[];
}) {
  const map = new Map<string, { ordered: number; delivered: number; unit?: string }>();
  for (const o of ordered) {
    map.set(o.name, { ordered: o.quantity, delivered: 0, unit: o.unit });
  }
  for (const d of delivered) {
    const existing = map.get(d.name);
    if (existing) existing.delivered = d.quantity;
    else map.set(d.name, { ordered: 0, delivered: d.quantity, unit: d.unit });
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-slate-500">
        <tr>
          <th className="py-1">Item</th>
          <th className="py-1 text-right">Ordered</th>
          <th className="py-1 text-right">Delivered</th>
          <th className="py-1 text-right">Δ</th>
        </tr>
      </thead>
      <tbody>
        {Array.from(map.entries()).map(([name, row]) => {
          const diff = row.delivered - row.ordered;
          return (
            <tr key={name} className="border-t border-slate-100">
              <td className="py-1">{name} {row.unit && <span className="text-xs text-slate-500">({row.unit})</span>}</td>
              <td className="py-1 text-right">{row.ordered}</td>
              <td className="py-1 text-right">{row.delivered}</td>
              <td className={`py-1 text-right ${diff === 0 ? "text-slate-500" : "font-semibold text-red-700"}`}>
                {diff === 0 ? "✓" : diff > 0 ? `+${diff}` : diff}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
