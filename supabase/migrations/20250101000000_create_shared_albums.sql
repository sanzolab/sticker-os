-- Create shared_albums table for Supabase-backed album sharing.
-- Generates short share links instead of embedding album data in URLs.

create table shared_albums (
  id text primary key,
  payload jsonb not null,
  sender_name text not null default '',
  created_at timestamptz not null default now()
);

create index idx_shared_albums_created_at on shared_albums(created_at);

alter table shared_albums enable row level security;

-- Allow anyone to create a shared album link.
create policy "anon_insert_shared_albums" on shared_albums
  for insert to anon
  with check (true);

-- Allow anyone to read shared albums that are not expired (90-day TTL).
create policy "anon_select_shared_albums" on shared_albums
  for select to anon
  using (created_at > (now() - interval '90 days'));

-- Note: No update or delete policies. Rows are immutable after creation.
-- For periodic cleanup of expired rows, schedule a pg_cron job:
--
--   select cron.schedule(
--     'cleanup-expired-shared-albums',
--     '0 3 * * *',
--     $$ delete from shared_albums where created_at <= now() - interval '90 days' $$
--   );
--
-- Or run manually: delete from shared_albums where created_at <= now() - interval '90 days';
