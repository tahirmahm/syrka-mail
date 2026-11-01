# UI, authentication and interactive-demo refinement

Continues the reference implementation; the existing live mailbox, server-side provider adapters, encrypted credentials, Supabase schema and Qwen policy are retained. The live component was extracted from the page into `components/LiveMailbox.tsx`, not replaced by the demo.

## Implemented

- Neutral true-black theme: background #000000, sidebar #050505, reading/dialog surfaces #0c0c0c, neutral borders and persistent header appearance control.
- Syrka symbol/wordmark treatment replaces the envelope. Vector geometry was transcribed against the supplied raster references and proportions; the editable original vector/font assets were not available in the workspace. Exact original artwork identity is therefore not independently verified. Swap in the source SVG when accessible; do not describe the transcription as the original source asset.
- Separate, explicitly labelled Demo Mailbox. Initially 52 fictional messages in 42 threads, including ten threaded replies and Inbox, Sent, Drafts, Scheduled, Archive, Spam and Trash.
- Browser-local compose, autosaved/editable drafts, simulated send, reply/reply-all/forward, unread/read, stars, folder switching, search/category/sort filters, archive/trash/snooze, cancellable simulated schedules, safe text/calendar attachment previews/downloads, application stages, source-linked commitments with approval/dismiss/completion, reset and exit.
- Demo summary/reply suggestions are labelled simulated and make no model request. No demo mail, actions, accounts or attachments enter Supabase or a provider.
- Responsive desktop list/reader and mobile drawer/thread/composer. Modal focus containment and Escape support, compose/search shortcuts, visible focus and reduced-motion policy.
- Public configuration diagnostics name missing variables without exposing private values. Live connector cards distinguish missing configuration, ready, connecting, connected, reconnect-required and errors as runtime evidence permits.
- Explicit Supabase PKCE magic-link callback, optional token_hash verification, session restore and sign-out. Provider callback failures return to an informative connection screen; short-lived OAuth cookies are cleared at their original path.

## Verified versus external

Unit and Playwright tests verify local behavior and mocked auth/provider contracts. They do not prove receipt of a real sign-in email, real mailbox delivery, paid/free model entitlement or live cross-app execution. No live credentials are configured here.

The supplied production URL could not be read through this environment's proxy. The Vercel CLI is logged out; there is no authenticated project inspection, configuration change, deployment or verified Preview. A new feature branch is used to avoid updating the existing production/default branch. No extra Vercel project is created.

Real auth acceptance requires the dedicated Supabase public configuration and server role key, plus Site URL/redirect and email-sender verification. Provider activation additionally needs registered OAuth clients, a strong token-encryption key, the exact approved APP_URL and applicable Gmail/university/Zoho permissions. See SETUP.md.

## Demo limitations

No real delivery, live AI, uploaded attachments, hosted mailbox provisioning or cross-app writes occur. Scheduled simulation runs only while this browser is open or on its next visit. Browser storage is not a backup or encrypted private-mail store; do not paste confidential real correspondence into the demo. Safe sample attachments contain only fictional plain text or iCalendar content.
