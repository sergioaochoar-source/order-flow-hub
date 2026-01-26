-- Create public bucket for brand assets (logos, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Allow public read access to all files in the bucket
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Allow authenticated uploads (for admin use)
CREATE POLICY "Authenticated users can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-assets');

-- Allow authenticated updates
CREATE POLICY "Authenticated users can update brand assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-assets');

-- Allow authenticated deletes
CREATE POLICY "Authenticated users can delete brand assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-assets');