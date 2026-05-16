import { notFound } from "next/navigation";
import { getOrder } from "@/lib/db";
import { DeliveryForm } from "@/components/DeliveryForm";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Confirm delivery — Order #{order.id}</h1>
      <p className="mb-4 text-sm text-slate-600">
        Verify the quantities actually delivered. Adjust any line that didn&apos;t match.
      </p>
      <DeliveryForm orderId={order.id} ordered={order.items} />
    </div>
  );
}
