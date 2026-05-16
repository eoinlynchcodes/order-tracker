ALTER TABLE orders RENAME COLUMN customer_name TO supplier_name;

ALTER TABLE orders ALTER COLUMN delivery_address DROP NOT NULL;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_file_url TEXT;
