import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { PaymentForm } from "@/components/PaymentForm";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Record payment — Order #{order.id}</h1>
      <PaymentForm orderId={order.id} invoiceAmount={order.invoice_amount} />
    </div>
  );
}
