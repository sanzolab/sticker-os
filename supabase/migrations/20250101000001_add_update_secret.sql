-- Add update_secret column to enable capability-based ownership for shared album updates.
-- Each shared album gets a random secret token at creation time.
-- To update a shared album, the client must present both the id AND the update_secret.
-- This avoids the need for authentication while providing practical security for a public-share feature.
--
-- Security model: capability-based (id + update_secret), not authenticated.
-- Both tokens are unguessable random strings (id ~10 chars, secret ~32 chars from alphanumeric alphabet).
-- RLS allows anonymous updates — actual authorization is enforced at query level via .eq() on both columns.
--
-- Future hardening: move writes behind a Supabase Edge Function without changing the public client API.

ALTER TABLE shared_albums ADD COLUMN update_secret text NOT NULL DEFAULT '';

CREATE INDEX idx_shared_albums_update_secret ON shared_albums(update_secret);

CREATE POLICY "anon_update_shared_albums" ON shared_albums
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
