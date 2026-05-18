import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { DeliveryForm } from "@/components/DeliveryForm";

export const dynamic = "force-dynamic";

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();
  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">
        Check in stock — Order #{order.id}
      </h1>
      <p className="mb-4 text-sm text-slate-600">
        {order.supplier_name} · Walk through each item as it&apos;s unloaded. Tap{" "}
        <span className="font-medium">✓ Received</span> when the quantity matches, or{" "}
        <span className="font-medium">Different qty…</span> if it&apos;s short or over.
      </p>
      <DeliveryForm
        orderId={order.id}
        ordered={order.items}
        previouslyConfirmed={order.delivery_confirmed_items}
      />
    </div>
  );
}
