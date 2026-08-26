/*
# Storage policies for media bucket

1. Security
- Authenticated users can upload to their own folder (user_id/profile_id path).
- Public read for all media (bucket is public).
- Owners can delete their own files.
*/

-- Allow public read
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
CREATE POLICY "media_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');

-- Allow authenticated upload
DROP POLICY IF EXISTS "media_auth_upload" ON storage.objects;
CREATE POLICY "media_auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow owners to update/delete their own files
DROP POLICY IF EXISTS "media_owner_update" ON storage.objects;
CREATE POLICY "media_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "media_owner_delete" ON storage.objects;
CREATE POLICY "media_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
