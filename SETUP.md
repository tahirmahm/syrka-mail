# Syrka Mail setup

Current backend target: **Syrka Mail**, `grlbuiemvkmaflogryta`, https://grlbuiemvkmaflogryta.supabase.co.

Read [BACKEND.md](docs/BACKEND.md) for exact configuration, migration order, security tests and live-access blockers. Read [WORKFLOWS.md](docs/WORKFLOWS.md) for inline replies, calendar and contextual demo capabilities.

## Development

```sh
npm ci
test -f .env.local || cp .env.example .env.local
npm run backend:check
npm run dev
```

Preserve an existing `.env.local`, especially TOKEN_ENCRYPTION_KEY. The current machine already has the supplied public project configuration in that ignored file and a provisional local development encryption key. No private value belongs in source control or chat. A development key must not replace an existing production key protecting stored credentials.

The app remains explorable without live credentials through Demo Mailbox or `/?demo=1`. Demo storage and actions stay inside the browser. Signing in does not import fictional mail, courses, applications, tasks or events into the real backend.

## Verification

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
```

The suite includes actual local PostgreSQL migration/RLS tests, unit/provider mocks and browser interaction tests. Supabase/Vercel live checks are a separate acceptance stage. CLI `db:dry-run` stops before SQL if it is not linked to the exact dedicated project.

## Public and server configuration

Use NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, retaining ANON_KEY as a fallback for older configuration. The installed SDK supports the supplied publishable format. SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) is server-only. The application rejects unrelated project URLs and accidental server keys in public fields.

The official cookie helper handles browser PKCE sessions. Server APIs validate users with Supabase Auth. Drafts/preferences use user JWTs and RLS; privileged provider/receipt/action operations retain scoped server checks. Auth URLs must allow the approved stable/Preview `/auth/callback` origins. Real email delivery, remote migrations, advisors and actual Vercel variables are not verified in this environment yet.

## Providers

APP_URL must be the exact approved deployment origin; production-mode provider registration requires HTTPS. Register these exact OAuth redirects on each authorized provider:

- `${APP_URL}/api/oauth/gmail/callback`
- `${APP_URL}/api/oauth/microsoft/callback`
- `${APP_URL}/api/oauth/zoho/callback`

Set the matching *_CLIENT_ID and *_CLIENT_SECRET securely. Gmail additionally requires GMAIL_ENABLED=true only after consent/test-user/scope approval. Microsoft uses delegated Mail.ReadWrite, Mail.Send, User.Read and offline_access; respect university administrator consent and conditional access. No application-wide mailbox administration is requested.

Zoho must use matching approved regional ZOHO_ACCOUNTS_URL and ZOHO_MAIL_URL. The adapter supports the configured .com/.eu/.in/.com.au regions. Verify current API entitlement and licensed test-organization access before real activation. Native Zoho reply threading remains gated; no unsupported operation is silently simulated in live mode.

Provider tokens are encrypted at rest and refreshed server-side. Disconnect deletes local credentials; provider-side grant revocation remains an additional requirement. No real provider has been connected or tested here. Supplying Supabase configuration does not grant mailbox permissions.

## Hosted mailbox pilot

Use an explicitly approved organization and owned test subdomain. `mail.syrka.co` is an example, not a configured domain. Obtain actual verification/MX/SPF/DKIM/DMARC values from the approved organization's Zoho console. Do not change existing @syrka.co routing. Institutional provisioning, aliases, quotas and commercial partner entitlement remain separate authorized work; no addresses or DNS records have been provisioned.

## Alibaba/Qwen

AI is off unless the dedicated Mail environment has current verified Free Quota Only entitlement, approved model selection, correct region endpoint and credentials. Each request additionally needs selected-content consent and rate limiting. No paid fallback, inherited Roadmaps credentials, embeddings, OCR or cross-app writes are introduced. Demo suggestions are labelled simulated.

## Vercel

Use only the existing `syrka-mail` project and `tahirmahm/syrka-mail` Git integration. Current CLI access reports Logged out and the runtime proxy blocks project inspection. Do not create another project, use an unclaimed temporary deployment, modify Syrka domains or deploy --prod.

After authentication/network access is available, inspect the existing production branch first, set the dedicated public/server bindings for the feature Preview, configure APP_URL and allowed callbacks to the actual origin, then deploy and poll until READY. Verify its actual HTTP/browser URL. A Git push, printed URL, configuration draft or successful local build is not proof of a deployed Preview. Production configuration and production deployment are separate; no automatic promotion is authorized.
