# Validation evidence

Validated in this cloud machine on 1 November 2026 using Node 24.19.0, npm 11.9.0 and the lockfile-resolved Next.js 16.4.3.

- `npm run typecheck`: passed.
- `npm test`: 18 tests passed, zero failed or skipped. These are local security and mocked provider-contract tests, not real provider integration tests.
- `npm run build`: passed; application, auth callback and eleven API routes compiled.
- `npm run test:browser`: 15 tests passed, zero failed or skipped using installed Chromium. Verified disconnected desktop/mobile UI, persistent theme after refresh, compose/settings modal behavior, disabled sending while signed out, and protected API failures without configuration.
- `npm audit --omit=dev`: zero reported vulnerabilities at the time of the check.

The initial browser run found a real persistent-theme initialization bug; it was corrected and the affected checks rerun. The final browser run has no hydration mismatch warnings. Next.js build/test tools require process and loopback access outside this executor's default command sandbox. This is an execution restriction, not an application compilation failure.

## Screenshots

- `artifacts/desktop-light.png`
- `artifacts/desktop-dark.png`
- `artifacts/mobile.png`
- `artifacts/compose.png`

These show the local disconnected application and empty composer. Additional demo screenshots show clearly fictional messages, threaded conversations and simulated composition. They are not evidence of real delivery.

## External checks

- HTTPS Git read: succeeded; the repository was initially empty.
- Official Vercel documentation fetch: blocked by CONNECT proxy HTTP 403 after network-approval retry. No unchanged retry loop performed.
- Official Vercel CLI 65.9.0 `whoami`: **Logged out**. No authenticated project list/create/deploy was possible.
- Supabase schema execution, user login, tenant isolation against a real database, real OAuth, real fetching/sending/attachments, Qwen inference and cross-app action execution: **unrun**, because authorized configuration is unavailable.
- Vercel Preview: **not created or verified**. No production deployment or Syrka domain modification performed.

See STATUS.md for implemented versus outstanding functionality; this evidence does not establish production readiness or completion of the master product specification.

Refinement screenshots: demo-light.png, demo-thread-light.png, demo-thread-dark.png, demo-mobile-inbox.png, demo-mobile-thread.png, demo-compose-mobile.png and connections-required.png. All are in artifacts/.

The browser suite also verifies a mocked PKCE request, callback exchange, session persistence and sign-out. The mock contract tests are explicitly not real sign-in email-delivery acceptance. Demo tests assert there are no live mail, OAuth, AI, action or Supabase requests while using the demo.
