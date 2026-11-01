# Dedicated Supabase backend: configuration and verification

Target project: **Syrka Mail**, `grlbuiemvkmaflogryta`.
API origin: `https://grlbuiemvkmaflogryta.supabase.co`.

The public configuration is prepared in this machine's ignored `.env.local`. **This is not a claim that the remote database, Auth settings or Vercel environment have been configured.** No other Supabase project is used. The paused Syrka.V12 project and other Syrka application databases remain untouched.

## Current evidence

- Installed Supabase JS 2.118.0 supports `sb_publishable_` and `sb_secret_` formats. The installed SDK's implementation and official release notes were inspected. The official SSR guide and SDK changelog were read from Supabase's GitHub sources because supabase.com is blocked by the proxy.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is preferred; `NEXT_PUBLIC_SUPABASE_ANON_KEY` remains a supported fallback. Public configuration refuses a server-secret prefix or a legacy service-role JWT. The server returns only intentionally public configuration and presence/status diagnostics.
- Project guards reject unrelated Supabase URLs and CLI links. `npm run backend:check` verifies the configured target without printing key values.
- Supabase CLI 2.122.0 is installed/usable. `supabase init` created local configuration without replacing the existing schema. **It is not linked remotely.** A read-only project-list attempt reports `Access token not provided`.
- The dedicated project's health endpoint and Supabase documentation website return proxy CONNECT HTTP 403 in this machine. Network access to the actual API has not been verified.
- No server key, management token or database password is bound here. An encryption key was generated only for local development in ignored `.env.local`, with permissions 0600. It is not a production key and must never overwrite an unknown deployment key protecting existing tokens.
- No magic-link email was sent, no remote migrations were applied, and remote security advisors were not run. The test recipient supplied in the session remains pending a reachable, authorized application origin.

## Environment configuration

Public:

- `SUPABASE_PROJECT_REF=grlbuiemvkmaflogryta`
- `NEXT_PUBLIC_SUPABASE_URL=https://grlbuiemvkmaflogryta.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the supplied public key, stored locally and declared in the environment draft. Legacy ANON_KEY is supported.

Server-only:

- `SUPABASE_SERVICE_ROLE_KEY`, or `SUPABASE_SECRET_KEY` for a current secret key: from this project only.
- `TOKEN_ENCRYPTION_KEY`: real 32-byte hex key for AES-256-GCM, preserved across deployment/rotation. It must be a usable local process secret, not a proxy placeholder.
- `APP_URL`: exact authorized deployment origin. Local development uses localhost; Preview must use its actual approved origin.

Setup-only:

- `SUPABASE_ACCESS_TOKEN`: securely bound management/CLI credential authorized for the intended project.
- `SUPABASE_DB_PASSWORD`: securely bound only if using the CLI's SQL connection. Never pass it as a visible command argument or put it in source control.

The draft contains the public variables, required Supabase HTTPS hosts and secure binding requirements. Draft persistence does not apply runtime networking or populate secrets; environment settings must apply/publish the changes. Direct PostgreSQL additionally needs the supported TCP permission. An HTTPS allowlist entry does not grant port 5432. Do not guess a pooler address or bypass the proxy.

## Migrations

Use the versioned migration chain. `supabase/schema.sql` is the reference initial baseline, not an additional migration to run before the chain.

1. `20261101000100_initial.sql`: connections and encrypted tokens, private drafts/preferences, source-linked proposals, idempotency receipts, rate limits and future jobs. Every private table enables RLS. Token/job/receipt tables deny browser roles. The reserved `window` identifier is correctly quoted; the rate-limit function has a fixed search path.
2. `20261101000200_inline_reply_drafts.sql`: bounded inline draft HTML, attachments and reply-account/source context.
3. `20261101000300_least_privilege.sql`: explicit grants, owner indexes, forced RLS for private application data and the ownership-only RPC. Direct client writes cannot attach a draft to someone else's mailbox. Actions remain read-only to browser roles; guarded state transitions occur server-side.

All three migrations execute against an ephemeral, real PostgreSQL engine in tests. Two test identities demonstrate draft persistence, isolated preferences/actions, denied cross-user reads/updates, denied cross-account reply contexts and denied credential reads. This does **not** establish that those migrations or policies are present in the remote Supabase project.

When authorized connectivity is supplied:

```sh
npm run backend:check
npx --yes supabase@2.122.0 link --project-ref grlbuiemvkmaflogryta
npx --yes supabase@2.122.0 migration list --linked
npm run db:dry-run
npm run db:push
npx --yes supabase@2.122.0 migration list --linked
```

Before pushing, inspect existing tables/policies using `scripts/inspect-mail-schema.sql`. If a baseline was applied manually, reconcile its exact schema and migration history first; do not blindly repair history, replay CREATE TABLE statements, reset the database or drop data. The database commands refuse a missing or different CLI project link. In the current instance the dry run deliberately stops at that guard, before any remote SQL.

Run the project's security advisors once management access is available. Local SQL tests are not a substitute for the remote advisor report.

## Authentication and persistence

The active client uses official `@supabase/ssr` 0.12.7 cookie storage, PKCE, SameSite=Lax and HTTPS Secure cookies. These browser-SDK session cookies are intentionally JavaScript-readable; they are not claimed to be HttpOnly. A prepared server helper uses request cookies. Server APIs verify the user through Supabase Auth and never use getSession as authorization. API and Auth responses use private/no-store caching. There is no competing server/client refresh proxy on the client-rendered root.

Private drafts and preferences use the user's JWT, publishable key and database RLS; they do not require service-role bypass. Themes synchronize after sign-in. Provider credential operations, delivery receipts and guarded proposal mutations retain verified-user server operations. The service key never reaches the browser.

Magic links return to `/auth/callback`; codes are exchanged explicitly and removed from the address bar. Expired/missing links have a recovery path. If the configured email template supplies a code, the sign-in dialog also supports email-code verification. Do not type links, OTPs or secrets into this chat.

Set the remote Auth Site URL to the approved stable Mail origin and add **exact** authorized Preview `/auth/callback` URLs. `supabase/config.toml` contains local development settings only; do not push it to production Auth configuration blindly. The guarded helper:

```sh
node scripts/configure-mail-auth.mjs --preview-origin=https://ACTUAL-VERIFIED-SYRKA-MAIL-PREVIEW.vercel.app
# Default: inspect and show the non-secret intended patch.
# Only after checking it, repeat with --apply to update this project's Auth URLs.
```

It verifies the remote project identity, preserves existing redirect entries, and changes no SMTP settings or other projects. It has not run against the remote API here. Keep SMTP secrets in secure bindings; inspect the dedicated project's default-email restrictions and rate limits before a single authorized delivery test. A successful OTP request alone is not proof of email receipt or sign-in.

`npm run backend:live` is an opt-in authorized integration probe. It creates two random temporary Auth users (confirmed by the admin API, without email), verifies real signed-session draft/preferences/action isolation, then removes those users and their test data. It never creates provider accounts, imports demo messages, sends mail or calls AI. It has not been run here because the required server key and network access are absent.

## Vercel and owner prerequisites

The existing project is `syrka-mail`; no new project is created. The official Vercel CLI reports Logged out. Its project settings, production branch, environment bindings and Preview status cannot be inspected with current access. No production promotion or Syrka domain change is performed.

To finish live activation, the owner must securely supply the dedicated server key and management/SQL access, apply the saved network configuration, and authenticate the existing Vercel account. Then the agent can inspect/link the exact project, apply verified migrations, configure exact callback origins, set Preview variables, deploy the feature branch and verify READY plus the actual URL. Production variables can be prepared when authorized, but production deployment remains prohibited.

Gmail, Microsoft and Zoho still need their own OAuth registrations/consents. Supabase public configuration alone does not connect any mailbox. Qwen remains server-only, consent-gated and disabled without current Free Quota Only verification; no paid fallback or other Syrka application's keys are used.

Official references reviewed:

- https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/server-side/creating-a-client.mdx
- https://github.com/supabase/supabase-js/blob/master/packages/core/supabase-js/CHANGELOG.md
- https://github.com/supabase/supabase-js/releases/tag/v2.118.0
