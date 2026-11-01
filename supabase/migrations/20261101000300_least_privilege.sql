-- Dedicated Mail project only. Token/job/receipt tables remain server-only.
revoke all on public.mail_preferences, public.mail_drafts, public.proposed_actions from anon;
grant select, insert, update, delete on public.mail_preferences, public.mail_drafts to authenticated;
revoke all on public.proposed_actions from authenticated;
grant select on public.proposed_actions to authenticated;
-- Presence-only ownership check: never expose encrypted token columns to users.
create or replace function public.owns_mail_account(p_account_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.mail_connections c where c.id=p_account_id and c.user_id=(select auth.uid()));
$$;
revoke all on function public.owns_mail_account(uuid) from public, anon;
grant execute on function public.owns_mail_account(uuid) to authenticated;
-- Even direct PostgREST writes must reference an account owned by this JWT identity.
drop policy "Own drafts" on public.mail_drafts;
create policy "Own drafts" on public.mail_drafts for all to authenticated
 using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id and (reply_context is null or public.owns_mail_account((reply_context->>'accountId')::uuid)));
create index if not exists mail_drafts_owner_updated on public.mail_drafts(user_id,updated_at desc);
create index if not exists proposed_actions_owner_created on public.proposed_actions(user_id,created_at desc);
-- Force RLS on owned data even for ordinary table-owner sessions; Supabase service_role still has its deliberate bypass.
alter table public.mail_drafts force row level security;
alter table public.mail_preferences force row level security;
alter table public.proposed_actions force row level security;

grant all on public.mail_connections,public.proposed_actions,public.mail_deliveries,public.mail_jobs to service_role;
grant select,delete on public.mail_drafts to service_role;
create index if not exists mail_deliveries_owner on public.mail_deliveries(user_id);
create index if not exists mail_jobs_owner on public.mail_jobs(user_id);
