-- pdfedit backend schema for Supabase Postgres.
-- Run once in the Supabase SQL editor (or psql). Safe to re-run.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  password_hash text not null,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  created_at timestamptz not null default now(),
  last_login timestamptz
);

create table if not exists usage_events (
  id bigserial primary key,
  identity text not null,
  tool text not null,
  success boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists usage_events_identity_tool_time
  on usage_events (identity, tool, created_at desc);

create table if not exists files (
  id bigserial primary key,
  identity text not null,
  tool text not null,
  original_name text,
  result_name text,
  size_bytes integer,
  created_at timestamptz not null default now()
);
create index if not exists files_identity_time
  on files (identity, created_at desc);

-- Defense in depth: the backend uses the service-role key (bypasses RLS),
-- but lock the tables down for any other key anyway.
alter table users enable row level security;
alter table usage_events enable row level security;
alter table files enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'deny-all-users') then
    create policy "deny-all-users" on users for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'deny-all-usage') then
    create policy "deny-all-usage" on usage_events for all using (false) with check (false);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'deny-all-files') then
    create policy "deny-all-files" on files for all using (false) with check (false);
  end if;
end $$;

-- To grant premium manually (no payment gateway yet):
--   update users set plan = 'premium' where email = 'someone@example.com';
