-- Add label_url column to store the Shippo label PDF URL
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS label_url text;