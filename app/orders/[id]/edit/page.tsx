import { notFound } from "next/navigation";
import { OrderForm } from "@/components/OrderForm";
import { getOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Edit order #{order.id}</h1>
      <OrderForm mode="edit" initial={order} />
    </div>
  );
}
