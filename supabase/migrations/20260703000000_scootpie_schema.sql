-- ============================================================
-- Scootpie: Full Schema + Storage Setup
-- Run via: supabase db push --db-url <connection_string>
-- Or paste into Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────

-- User photos (up to 3 model photos per user)
create table if not exists user_photos (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  data        text not null,         -- base64 image
  gender      text not null default 'unisex',
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Digital wardrobe / closet items
create table if not exists wardrobe (
  id           text primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_json jsonb not null,       -- Product type stored as JSONB
  created_at   timestamptz not null default now()
);

-- Generated try-on looks (history + lookbook)
create table if not exists generated_looks (
  id          text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  result_json jsonb not null,        -- TryOnResult type stored as JSONB
  created_at  timestamptz not null default now()
);

-- Chat sessions (AI stylist conversation threads)
create table if not exists chat_sessions (
  id            text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'New Session',
  preview_text  text,
  last_modified timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- Chat messages within sessions
create table if not exists chat_messages (
  id          text primary key,
  session_id  text not null references chat_sessions(id) on delete cascade,
  role        text not null,         -- 'user' | 'model'
  text        text not null,
  timestamp   timestamptz not null default now(),
  meta_json   jsonb,                 -- attachments, groundingMetadata, etc.
  created_at  timestamptz not null default now()
);

-- Waitlist signups
create table if not exists waitlist (
  id         bigint generated always as identity primary key,
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ─────────────────────────────────────────────────────────────

create index if not exists idx_user_photos_user_id     on user_photos(user_id);
create index if not exists idx_wardrobe_user_id        on wardrobe(user_id);
create index if not exists idx_generated_looks_user_id on generated_looks(user_id);
create index if not exists idx_chat_sessions_user_id   on chat_sessions(user_id, last_modified desc);
create index if not exists idx_chat_messages_session   on chat_messages(session_id, timestamp asc);

-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

alter table user_photos      enable row level security;
alter table wardrobe         enable row level security;
alter table generated_looks  enable row level security;
alter table chat_sessions    enable row level security;
alter table chat_messages    enable row level security;
alter table waitlist         enable row level security;

-- user_photos: users can only access their own photos
drop policy if exists "user_photos_owner" on user_photos;
create policy "user_photos_owner" on user_photos
  for all using (auth.uid() = user_id);

-- wardrobe: users can only access their own wardrobe
drop policy if exists "wardrobe_owner" on wardrobe;
create policy "wardrobe_owner" on wardrobe
  for all using (auth.uid() = user_id);

-- generated_looks: users can only access their own looks
drop policy if exists "generated_looks_owner" on generated_looks;
create policy "generated_looks_owner" on generated_looks
  for all using (auth.uid() = user_id);

-- chat_sessions: users can only access their own sessions
drop policy if exists "chat_sessions_owner" on chat_sessions;
create policy "chat_sessions_owner" on chat_sessions
  for all using (auth.uid() = user_id);

-- chat_messages: users can access messages in their own sessions
drop policy if exists "chat_messages_owner" on chat_messages;
create policy "chat_messages_owner" on chat_messages
  for all using (
    exists (
      select 1 from chat_sessions
      where chat_sessions.id = chat_messages.session_id
        and chat_sessions.user_id = auth.uid()
    )
  );

-- waitlist: anyone can insert, no one can read (admin only via service role)
drop policy if exists "waitlist_insert" on waitlist;
create policy "waitlist_insert" on waitlist
  for insert with check (true);

-- ─────────────────────────────────────────────────────────────
-- 4. STORAGE BUCKET
-- ─────────────────────────────────────────────────────────────

-- Create the public bucket for image uploads (used to bypass body size limits)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'scootpie-images',
  'scootpie-images',
  true,
  10485760,  -- 10MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760;

-- Storage RLS: allow authenticated and anonymous users to upload/read/delete temp images
drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select using (bucket_id = 'scootpie-images');

drop policy if exists "storage_auth_insert" on storage.objects;
create policy "storage_auth_insert" on storage.objects
  for insert with check (bucket_id = 'scootpie-images');

drop policy if exists "storage_auth_delete" on storage.objects;
create policy "storage_auth_delete" on storage.objects
  for delete using (bucket_id = 'scootpie-images');
