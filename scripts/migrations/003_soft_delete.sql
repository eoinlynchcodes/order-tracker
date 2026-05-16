ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orders_deleted_at ON orders (deleted_at);
