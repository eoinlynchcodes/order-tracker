-- Add a dedicated text field for payment-related notes
-- (separate from the general `notes` field so the UI can show it next to paid/paid_date/paid_amount)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_notes TEXT;
