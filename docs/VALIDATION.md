# Validation evidence

Validated locally on 1 November 2026 using Node 24.19.0, npm 11.9.0 and lockfile-resolved Next.js 16.4.3.

- `npm run typecheck` and `npm run build`: passed.
- `npm test`: 35 passed, zero failed or skipped. Includes provider HTTP mocks, account isolation, project/key guards, reply safety, calendar dates and approval provenance, and actual PostgreSQL migration/RLS execution in PGlite.
- `npm run test:browser`: 24 passed using Chromium. Covers responsive inbox and thread navigation, persistent light/dark mode, inline reply/draft/forward/attachments, Calendar month/week/day/agenda and approval, contextual Academic and Applications workflows, and mocked authentication/session/preferences/draft persistence.
- `npm audit --omit=dev`: zero reported vulnerabilities.
- `npm run backend:check`: exact dedicated project and public configuration validated locally; server credentials absent.
- `npm run db:dry-run`: safely stopped at missing project-link guard before remote SQL. This is not a successful remote migration test.

The PostgreSQL test executes the migration chain and verifies two fixture identities cannot read or mutate one another’s private drafts/preferences, access encrypted mailbox tokens, insert drafts under another account, or directly execute proposed actions. Its auth roles and `auth.uid()` are local fixtures. This is meaningful SQL/RLS validation, **not a live Supabase Auth or remote tenant-isolation test**.

Browser authentication uses mocked HTTP responses. No real magic-link email, OTP, remote session, provider message delivery or AI inference is proven by these tests. The mobile checks use Chromium phone and reduced-height viewports, not a physical iPhone keyboard.

## Screenshots

All screenshots are local captures. Demo mail and workflows are fictional and visibly labelled; they do not prove real provider connectivity.

- `artifacts/demo-thread-light.png`, `artifacts/demo-thread-dark.png`
- `artifacts/inline-reply-desktop.png`, `artifacts/inline-reply-mobile.png`
- `artifacts/calendar-month-light.png`, `artifacts/calendar-month-dark.png`, `artifacts/calendar-mobile-dark.png`, `artifacts/calendar-agenda.png`
- `artifacts/academic-desktop.png`, `artifacts/academic-mobile.png`, `artifacts/applications-desktop.png`
- `artifacts/connections-required.png`

## External checks and limits

- Git HTTPS fetch/push works through platform authentication.
- Supabase project API, Vercel documentation and the existing deployment hostname returned execution-proxy CONNECT HTTP 403. Runtime inspection still reports no custom allowed hosts; saved configuration requirements are not applied runtime access.
- Official Supabase CLI 2.122.0 reports no access token; no remote project is linked. Official Vercel CLI 65.9.0 reports logged out. Network access and authentication are separate blockers.
- Official Supabase SSR guidance and SDK release material were reviewed through their official GitHub sources. The installed SDK’s publishable-key behavior is checked against a mocked HTTP boundary.
- Remote migration history, actual Supabase RLS/advisors, real email receipt/session refresh, OAuth providers, Qwen entitlement/inference and cross-application execution remain unverified.
- Vercel environment changes, Git Preview automation and a READY Preview URL are unverified. No production deployment or Syrka domain changes were performed.

See [BACKEND.md](BACKEND.md) for activation requirements and [WORKFLOWS.md](WORKFLOWS.md) for implemented versus contract-only workflows. These results do not establish completion of the full master product specification or production readiness.
