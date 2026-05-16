import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { InvoiceForm } from "@/components/InvoiceForm";
import { PAYMENT_TERMS } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();
  const termsLabel = PAYMENT_TERMS.find((t) => t.value === order.payment_terms)?.label ?? order.payment_terms;
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Add invoice — Order #{order.id}</h1>
      <p className="mb-4 text-sm text-slate-600">
        Payment terms on this order: <span className="font-medium">{termsLabel}</span>. The due date is computed automatically.
      </p>
      <InvoiceForm orderId={order.id} initialInvoice={order.invoice_number} initialAmount={order.invoice_amount} initialDate={order.invoice_date} />
    </div>
  );
}
