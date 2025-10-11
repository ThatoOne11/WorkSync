-- This is a destructive migration. It's necessary because we are changing the
-- fundamental data model from a single-user system to one scoped by a user_id.

-- 1. Clear any old data from the tables.
TRUNCATE TABLE public.projects
, public.weekly_summaries, public.settings RESTART IDENTITY CASCADE;

-- 2. Drop previous RLS policies and user_id constraints if they exist from failed attempts.
-- The IF EXISTS clauses make this script safely re-runnable.
alter table public.projects disable row level security;
alter table public.weekly_summaries disable row level security;
alter table public.settings disable row level security;
drop policy
if exists "Users can manage their own projects." on public.projects;
drop policy
if exists "Users can manage their own weekly summaries." on public.weekly_summaries;
drop policy
if exists "Users can manage their own settings." on public.settings;
alter table public.settings drop constraint if exists settings_user_id_key_key;

-- 3. Re-configure the tables to use a generic UUID for the browser-based user_id.
alter table public.projects drop column if exists user_id;
alter table public.projects add column user_id uuid not null;

alter table public.weekly_summaries drop column if exists user_id;
alter table public.weekly_summaries add column user_id uuid not null;

alter table public.settings drop column if exists user_id;
alter table public.settings add column user_id uuid not null;

-- 4. Re-add the unique constraint for the settings table.
alter table public.settings add constraint settings_user_id_key_key unique
(user_id, key);