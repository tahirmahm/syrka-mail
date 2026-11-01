-- Read-only inventory before any linked migration application.
select current_database(),current_user;
select schemaname,tablename from pg_tables where schemaname='public' and tablename in ('mail_connections','mail_preferences','mail_drafts','proposed_actions','rate_limit_buckets','mail_deliveries','mail_jobs');
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies where schemaname='public';
select c.relname,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';
select to_regclass('supabase_migrations.schema_migrations') as migration_history;
