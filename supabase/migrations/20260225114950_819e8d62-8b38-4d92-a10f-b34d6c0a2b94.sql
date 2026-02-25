
-- Add tracking status fields to shipments
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS tracking_status text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS tracking_details jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS delivered_at timestamp with time zone;

-- Index for quick lookups by tracking number
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments (tracking_number);
