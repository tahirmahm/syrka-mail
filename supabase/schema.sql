-- Initial migration. Apply only to the dedicated Syrka Mail Supabase project.
create table public.mail_connections (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null check (provider in ('gmail','microsoft','zoho')),
 address text not null,
 access_token text not null, -- AES-256-GCM ciphertext, never plaintext
 refresh_token text,
 expires_at timestamptz,
 api_domain text,
 account_id text,
 created_at timestamptz not null default now(),
 unique(user_id,provider,address)
);
alter table public.mail_connections enable row level security;
revoke all on public.mail_connections from anon, authenticated;
create table public.mail_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 theme text not null default 'light' check(theme in ('light','dark'))
);
alter table public.mail_preferences enable row level security;
create policy "Own preferences" on public.mail_preferences for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create table public.mail_drafts (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 "to" text not null default '',cc text not null default '',bcc text not null default '',subject text not null default '',text text not null default '',updated_at timestamptz not null default now()
);
alter table public.mail_drafts enable row level security;
create policy "Own drafts" on public.mail_drafts for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
create table public.proposed_actions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null, idempotency_key text not null,
 state text not null default 'proposed' check(state in ('proposed','approved','executing','completed','failed','dismissed')),
 destination_object_id text, created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
alter table public.proposed_actions enable row level security;
-- State transitions are server-controlled; no direct writes from browser clients.
create policy "Own action feed" on public.proposed_actions for select to authenticated using(auth.uid()=user_id);
create table public.rate_limit_buckets(user_id uuid references auth.users(id) on delete cascade,bucket text,window timestamptz,hits integer not null,primary key(user_id,bucket,window));
alter table public.rate_limit_buckets enable row level security;
revoke all on public.rate_limit_buckets from anon,authenticated;
create function public.consume_rate_limit(p_user uuid,p_bucket text,p_limit integer) returns boolean language plpgsql security definer set search_path=public as $$
declare count integer;
begin
 insert into rate_limit_buckets(user_id,bucket,window,hits) values(p_user,p_bucket,date_trunc('minute',now()),1)
 on conflict(user_id,bucket,window) do update set hits=rate_limit_buckets.hits+1 returning hits into count;
 return count<=p_limit;
end $$;
revoke all on function public.consume_rate_limit(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(uuid,text,integer) to service_role;
create table public.mail_deliveries (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 state text not null check(state in ('sending','accepted','unknown')),created_at timestamptz not null default now()
);
alter table public.mail_deliveries enable row level security;
revoke all on public.mail_deliveries from anon,authenticated;
-- Queue contract for future background sync/scheduled sending workers. No scheduler is deployed yet.
create table public.mail_jobs (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null, payload jsonb not null, idempotency_key text not null unique,
 state text not null default 'queued' check(state in ('queued','running','completed','failed','cancelled')),
 run_after timestamptz not null default now(),attempts integer not null default 0,lease_until timestamptz,
 created_at timestamptz not null default now()
);
alter table public.mail_jobs enable row level security;
revoke all on public.mail_jobs from anon,authenticated;
