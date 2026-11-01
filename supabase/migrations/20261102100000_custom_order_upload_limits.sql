-- What the custom-order bucket will accept.
--
-- The form lets anybody attach a photograph or a voice note without signing in,
-- which is the point: somebody describing a piece should not have to make an
-- account first. But the bucket took that on trust. It had no size limit, no
-- list of accepted types and no required folder, so anyone holding the
-- publishable key — which ships in every page, as it must — could put a file of
-- any kind and any size anywhere in it, as often as they liked. The bucket is
-- private, so none of it could be served to the public; the cost was the shop's
-- storage bill and whatever sat in it.
--
-- The limits below are the ones the form already enforces in the browser.
-- src/lib/custom-orders.ts holds the same two facts: MAX_ATTACHMENT_BYTES is
-- 12 MB and IMAGE_TYPES is this list. A browser check stops an honest mistake;
-- this stops everything else, and the two must be changed together.

DO $$
BEGIN
  UPDATE storage.buckets
     SET file_size_limit = 12 * 1024 * 1024,
         allowed_mime_types = ARRAY[
           'image/jpeg',
           'image/png',
           'image/webp',
           'image/heic',
           'image/avif',
           /*
            * Recordings, by family rather than by name. MediaRecorder hands
            * back a type with its codec attached — "audio/webm;codecs=opus" —
            * and which one a phone picks depends on the browser: Safari
            * records mp4 and refuses webm outright. A list of exact names
            * would turn that into a failed upload on somebody's phone and
            * nobody else's.
            *
            * Images are named one by one instead, because image/* would also
            * accept image/svg+xml, and an SVG is a document that can carry
            * script. These files are opened by the shop from a signed URL.
            */
           'audio/*'
         ]
   WHERE id = 'custom-orders';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not set limits on the custom-orders bucket — set them from the dashboard.';
END $$;

-- Somewhere to put it, too.
--
-- uploadAttachment writes photo/<uuid>.<ext> or voice/<uuid>.<ext>, so those
-- are the only two folders that exist. Requiring them keeps the bucket a place
-- the shop can read rather than one it has to search.
--
-- Dropped and recreated inside one block on purpose: if the CREATE fails for
-- want of privileges, the handler takes the DROP back with it and the form
-- keeps working on the policy it already had.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Anyone may attach to a custom order" ON storage.objects;

  CREATE POLICY "Anyone may attach to a custom order" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (
      bucket_id = 'custom-orders'
      AND (storage.foldername(name))[1] IN ('photo', 'voice')
    );
EXCEPTION WHEN insufficient_privilege THEN
  RAISE WARNING 'Could not replace the custom-orders insert policy — change it from the dashboard.';
END $$;
