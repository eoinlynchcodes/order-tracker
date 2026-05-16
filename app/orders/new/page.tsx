import { OrderForm } from "@/components/OrderForm";

export default function NewOrderPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">New order</h1>
      <OrderForm mode="create" />
    </div>
  );
}
