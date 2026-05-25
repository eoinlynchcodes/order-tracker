import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { computeStatus, PAYMENT_TERMS } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteOrderButton } from "@/components/DeleteOrderButton";

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
          <DeleteOrderButton orderId={order.id} supplierName={order.supplier_name} />
          <Link
            href={`/orders/${order.id}/delivery`}
            className={`rounded px-3 py-1.5 text-sm text-white ${
              order.actual_delivery_date
                ? "bg-slate-500 hover:bg-slate-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {order.actual_delivery_date ? "Re-check stock" : "Check in stock"}
          </Link>
          {order.actual_delivery_date && (
            <Link
              href={`/orders/${order.id}/invoice`}
              className={`rounded px-3 py-1.5 text-sm text-white ${
                order.invoice_number ? "bg-slate-500 hover:bg-slate-600" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {order.invoice_number ? "Edit invoice" : "Add invoice"}
            </Link>
          )}
          {order.invoice_number && (
            <Link
              href={`/orders/${order.id}/payment`}
              className={`rounded px-3 py-1.5 text-sm text-white ${
                order.paid ? "bg-slate-500 hover:bg-slate-600" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {order.paid ? "Edit payment" : "Record payment"}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Supplier">
          <Row label="Name">{order.supplier_name}</Row>
          <Row label="Contact">{order.contact_number ?? "—"}</Row>
        </Card>

        <Card title="Schedule">
          <Row label="Order date">{order.order_date}</Row>
          <Row label="Expected delivery">{order.expected_delivery_date ?? "—"}</Row>
          <Row label="Actual delivery">{order.actual_delivery_date ?? "—"}</Row>
        </Card>

        <Card title="Items ordered">
          <ItemTable items={order.items} />
        </Card>

        <Card title="Stock checked in">
          {order.delivery_confirmed_items ? (
            <DeliveryComparison
              ordered={order.items}
              delivered={order.delivery_confirmed_items}
            />
          ) : (
            <p className="text-sm text-slate-500">Stock not yet checked in.</p>
          )}
        </Card>

        <Card title="Invoice">
          <Row label="Invoice #">{order.invoice_number ?? "—"}</Row>
          <Row label="Amount">{order.invoice_amount ? `€${order.invoice_amount}` : "—"}</Row>
          <Row label="Invoice date">{order.invoice_date ?? "—"}</Row>
          <Row label="Payment terms">{termsLabel}</Row>
          <Row label="Payment due">
            <span className={status === "overdue" ? "font-semibold text-red-700" : ""}>
              {order.payment_due_date ?? "—"}
            </span>
          </Row>
          <Row label="Invoice file">
            {order.invoice_file_url ? (
              <a
                href={order.invoice_file_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 hover:underline"
              >
                Open file ↗
              </a>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Invoice link">
            {order.invoice_url ? (
              <a
                href={order.invoice_url}
                target="_blank"
                rel="noreferrer"
                className="break-all text-blue-700 hover:underline"
              >
                {order.invoice_url}
              </a>
            ) : (
              "—"
            )}
          </Row>
        </Card>

        <Card title="Payment">
          <Row label="Paid">{order.paid ? "Yes" : "No"}</Row>
          <Row label="Paid date">{order.paid_date ?? "—"}</Row>
          <Row label="Paid amount">{order.paid_amount ? `€${order.paid_amount}` : "—"}</Row>
          {order.payment_notes && (
            <Row label="Notes">
              <span className="whitespace-pre-wrap">{order.payment_notes}</span>
            </Row>
          )}
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

function ItemTable({
  items,
}: {
  items: { name: string; quantity: number; code?: string | null; notes?: string | null }[];
}) {
  const hasCode = items.some((it) => it.code);
  const hasNotes = items.some((it) => it.notes);
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-slate-500">
        <tr>
          {hasCode && <th className="py-1 pr-3">Code</th>}
          <th className="py-1">Item</th>
          <th className="py-1 text-right">Qty</th>
          {hasNotes && <th className="py-1 pl-3">Notes</th>}
        </tr>
      </thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} className="border-t border-slate-100 align-top">
            {hasCode && (
              <td className="py-1 pr-3 font-mono text-xs text-slate-600">{it.code ?? ""}</td>
            )}
            <td className="py-1">{it.name}</td>
            <td className="py-1 text-right">{it.quantity}</td>
            {hasNotes && (
              <td className="py-1 pl-3 text-xs text-slate-600">{it.notes ?? ""}</td>
            )}
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
  ordered: { name: string; quantity: number }[];
  delivered: { name: string; quantity: number }[];
}) {
  const map = new Map<string, { ordered: number; delivered: number }>();
  for (const o of ordered) {
    map.set(o.name, { ordered: o.quantity, delivered: 0 });
  }
  for (const d of delivered) {
    const existing = map.get(d.name);
    if (existing) existing.delivered = d.quantity;
    else map.set(d.name, { ordered: 0, delivered: d.quantity });
  }
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-slate-500">
        <tr>
          <th className="py-1">Item</th>
          <th className="py-1 text-right">Ordered</th>
          <th className="py-1 text-right">Checked&nbsp;in</th>
          <th className="py-1 text-right">Δ</th>
        </tr>
      </thead>
      <tbody>
        {Array.from(map.entries()).map(([name, row]) => {
          const diff = row.delivered - row.ordered;
          return (
            <tr key={name} className="border-t border-slate-100">
              <td className="py-1">{name}</td>
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
