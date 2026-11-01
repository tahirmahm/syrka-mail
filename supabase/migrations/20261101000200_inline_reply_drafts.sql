-- Apply after the initial schema. The dedicated Mail database only.
alter table public.mail_drafts add column if not exists reply_context jsonb;
alter table public.mail_drafts add column if not exists html text not null default '';
alter table public.mail_drafts add column if not exists attachments jsonb not null default '[]'::jsonb;
-- Existing ownership RLS remains in force. No other Syrka database is modified.
