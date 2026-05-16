CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  contact_number TEXT,
  delivery_address TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  delivery_confirmed_items JSONB,
  invoice_number TEXT,
  invoice_amount NUMERIC(12, 2),
  invoice_date DATE,
  payment_terms TEXT NOT NULL DEFAULT 'net_30',
  payment_due_date DATE,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date DATE,
  paid_amount NUMERIC(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders (order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_paid ON orders (paid);
CREATE INDEX IF NOT EXISTS idx_orders_payment_due_date ON orders (payment_due_date);
