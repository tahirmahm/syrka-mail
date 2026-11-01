# External setup and deployment

## Current execution-environment blockers

- Official `https://vercel.com/get-started.md` fetch returned HTTP 403 from the CONNECT proxy after retry. The observed running policy still had no custom Vercel host grants. The saved draft includes vercel.com; approved desired settings and enforced runtime settings are separate.
- Official Vercel CLI `whoami` returned **Logged out**. No Vercel integration tool, VERCEL_TOKEN binding, token variable or standard CLI auth file was available. Documentation access is not deployment authentication.
- A draft now requests `api.vercel.com` access and a personal `VERCEL_TOKEN` binding scoped to that API. Enter credentials securely in environment settings, never in chat. Saving a draft does not apply or publish it.
- No dedicated Supabase URL, anon key, service key, provider client credentials or Qwen key was present. No real mail request or model inference has been made.

Do not repeatedly retry unchanged blocked requests. After a meaningful policy or authentication change, retry the affected operation and inspect the actual response.

## Dedicated Supabase

1. Select/create the separately authorized Syrka Mail project. Do not reuse another Syrka database without explicit validation.
2. Apply `supabase/schema.sql` once as the initial migration. It creates connections, private drafts, preferences, source-linked action proposals, delivery receipts, rate-limit buckets and a future queue contract.
3. Configure email-link authentication, the approved app Site URL, and exact permitted Preview callback origins. Configure a reliable authentication-email sender.
4. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the application environment. Set SUPABASE_SERVICE_ROLE_KEY server-side only.
5. Set TOKEN_ENCRYPTION_KEY to a securely generated 32-byte hex key. Keep it in a secrets manager; it is required to decrypt provider credentials. Rotation requires decrypt/re-encrypt migration before removing the old key.
6. Check RLS using two separate test users. The current environment has no database to execute those integration tests against.

The initial client uses Supabase browser sessions and bearer authorization. Migrating application login to HttpOnly server sessions is outstanding before production. Provider OAuth cookies are already HttpOnly, authenticated-encrypted, state-bound, short-lived and Secure in production.

## Provider registration

Set APP_URL to the exact authorized app origin. Production-mode execution requires HTTPS.

Register redirect URIs:

- `${APP_URL}/api/oauth/zoho/callback`
- `${APP_URL}/api/oauth/microsoft/callback`
- `${APP_URL}/api/oauth/gmail/callback`

Register provider applications; populate the corresponding *_CLIENT_ID and *_CLIENT_SECRET server variables. Connect accounts from Settings only after signing in. Tokens are encrypted before server-only storage, automatically refreshed when expired, and never returned to the browser. Multiple addresses are stored separately and selectable in the header. Disconnection removes local credentials; the user must additionally revoke the grant at the provider. Provider-specific revocation calls remain outstanding.

### Zoho pilot

Choose matching regional ZOHO_ACCOUNTS_URL and ZOHO_MAIL_URL. The OAuth flow discovers the authorized mailbox and sending identity via the accounts API. Reading and sending are implemented but not verified against a licensed test organization. Complete provider API-entitlement checks before activation.

An organization administrator must approve the pilot organization, its licensing and an owned test domain/subdomain. `mail.syrka.co` is only an example and has not been configured. Obtain actual verification, MX, SPF, DKIM and DMARC records from that organization's Zoho console; this application supplies no invented DNS records. Apply only to the separately approved pilot domain. Do not alter existing @syrka.co mail routing. Organization/domain provisioning, aliases, quotas and roster onboarding remain unimplemented and require appropriate partner/API entitlement.

### Microsoft

Register a delegated Microsoft identity application with Mail.ReadWrite, Mail.Send, User.Read and offline_access. University administrators may require consent or prohibit third-party access. Respect conditional access. Do not grant application-wide administrator mailbox access. Test login, refresh, fetch, send and mutations with an authorized test mailbox.

### Gmail

Set GMAIL_ENABLED=true only after consent-screen/test-user/scope approval. The initial adapter requests gmail.modify for read/write/send operations. Confirm the current scope policy, privacy disclosures, deletion controls and any required restricted-scope verification/security assessment before public use. A development OAuth registration is not public authorization.

## Alibaba / Qwen — no paid fallback

Live AI is disabled by default, including when a key is present. Validate official current documentation, the actual account's model entitlement and **Free Quota Only** behavior for Syrka Mail. Set QWEN_MODEL explicitly; no candidate model name from the product brief is assumed available. Only after verifying configure QWEN_ENABLED, QWEN_FREE_QUOTA_VERIFIED, verification timestamps and a bounded QWEN_QUOTA_VERIFICATION_EXPIRES_AT. Use the correct region endpoint. Revocation/expiry must turn AI off. The app additionally requires consent for each selected-content request and enforces five requests/minute/user. Account-wide spend/quota telemetry is still required before public rollout; flags alone are not independent evidence of free quota.

No paid fallback, embeddings, reranking or OCR requests are implemented or made. Summaries and reply suggestions are code paths only, not live-verified features.

## Vercel Preview — owner-account access required

Follow the official get-started instructions once reachable. Do not use an unclaimed temporary deployment: it would not establish access to the user's existing account.

1. Authenticate using the supported existing-account integration or official CLI flow. Verify with `vercel whoami`, then list projects within the intended account/team. Do not print credentials.
2. Reuse exactly one existing `syrka-mail` project if present. Create that single project only if inspection confirms it is absent and project-creation permission is available.
3. Connect the project to `tahirmahm/syrka-mail` using the authorized GitHub integration. Confirm the GitHub App installation can read that repository.
4. Configure Next.js, project root `.`, npm lockfile installation and `npm run build`. Add dedicated Preview environment bindings securely. No other Syrka application variables should be copied implicitly.
5. Use the feature branch for Preview deployments. Do not deploy --prod, change production routing or attach existing Syrka domains. Confirm the repository's production-branch setting before enabling automatic deploys; feature branches should generate Previews.
6. Deploy with the supported tooling, poll until READY, then request the actual Preview URL and verify the application response and browser flow. A deployment ID, queued build or printed URL alone is not success.

No Vercel project, Git integration, deployment or public Preview has been created in this session. Automatic GitHub previews are pending authenticated project access. Preview protection policy should be checked before exposing private data.
