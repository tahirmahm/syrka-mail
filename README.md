# Syrka Mail

AI-assisted email and a source-linked action workspace. Built with Next.js App Router, React, strict TypeScript, Tailwind, Supabase and server-side mail adapters.

**Implementation in progress. This is not a production-ready email service.** The live UI contains no fabricated inbox messages. An optional, clearly labelled browser-local Demo Mailbox now includes 56 fictional messages and interactive mail workflows. The dedicated Supabase public client is configured locally; live database migrations, email delivery, providers and deployment remain unverified.

## Run

Node 24 LTS and npm 11 were used for validation.

```sh
npm ci
test -f .env.local || cp .env.example .env.local
# Populate only the dedicated, authorized Syrka Mail configuration.
npm run dev
```

Use the Demo Mailbox entry or `/?demo=1` to explore mail interactions without credentials. Missing credentials do not prevent exploring the disconnected live UI. They do prevent authenticated mail operations. See [SETUP.md](SETUP.md) before enabling services.

```sh
npm run typecheck
npm test
npm run build
npm run test:browser
```

Browser tests use system Chromium by default. Override the executable in playwright.config.ts for other machines. Tests exercise disconnected application behavior and local security invariants; they do not establish live mail or AI delivery.

## Structure

- `app/`: responsive application, settings, composer, source-linked commitments and authenticated API routes.
- `lib/providers.ts`, `lib/mail/adapter.ts`: mail domain model, provider operations and capability gates.
- `lib/oauth.ts`, `lib/crypto.ts`, `lib/server.ts`: OAuth, authenticated encryption, user isolation and durable rate limits.
- `lib/ai/`: fail-closed AI policy. Live calls require consent and current quota verification.
- `lib/actions.ts`, `lib/integrations/`: versioned proposals and future destination contracts.
- `supabase/schema.sql`: initial dedicated-project migration, RLS and rate-limit function.
- `tests/`: security unit tests and browser smoke tests.
- `docs/STATUS.md`: exact implementation and verification boundaries.
- `docs/SECURITY.md`: security model and remaining hardening.
- `docs/INTEGRATIONS.md`: ecosystem contracts and provider limitations.

Email is rendered as plain text. Remote email HTML and remote images are not loaded. No SMTP hosting, DNS changes or production domain changes are performed.

See [the refinement report](docs/REFINEMENT.md) for demo behavior, authentication changes and current deployment blockers.

The latest changes add inline replies, a native calendar and source-grounded Academic/Applications workspaces. See [WORKFLOWS.md](docs/WORKFLOWS.md) and [BACKEND.md](docs/BACKEND.md) for the current implementation and activation requirements.
