# Foresight Handoff-11 Positive Flow Readiness Audit

Date: 2026-05-09

## Scope

This is a read-only readiness audit for a future positive Core-to-Foresight
browser handoff smoke. It does not execute the handoff flow.

Repos inspected:

- `D:\Projects\AdMate\admate-agent-core`
- `D:\Projects\AdMate\admate-foresight`

## Verdict

Status: BLOCKED_FOR_HUMAN_RUNTIME_SETUP

The code-side contract is aligned enough to plan a positive smoke, but the smoke
is not safe to run automatically yet. A positive flow requires runtime env and
credential readiness, a Core authenticated session, Foresight product access, and
explicit approval because it can create and consume a real handoff row.

## Verified code contract

Core:

- `GET /auth/product/start` exists.
- Foresight callback is allowlisted as `https://foresight.admate.ai.kr/auth/handoff`.
- `POST /api/auth/handoff/redeem` exists.
- Core issue flow requires an authenticated Core session.
- Core redeem flow requires a product handoff credential.

Foresight:

- `/login` can build a Core start URL.
- `/auth/handoff` callback route exists.
- Foresight redeems through Core `/api/auth/handoff/redeem`.
- Foresight creates a product-local httpOnly session only after successful redeem.
- Protected pages use the product-local session guard.
- API routes now fail closed for no-session requests.

## Required runtime names

The audit recorded env variable names only. No values were read or printed.

Core production requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMATE_AUTH_HANDOFF_ENABLED`
- `ADMATE_AUTH_HANDOFF_FORESIGHT_ISSUE_ENABLED`
- `ADMATE_AUTH_HANDOFF_FORESIGHT_REDEEM_ENABLED`
- `ADMATE_AUTH_HANDOFF_FORESIGHT_KEY`

Foresight production requires:

- `FORESIGHT_AUTH_HANDOFF_ENABLED`
- `ADMATE_CORE_BASE_URL`
- `FORESIGHT_HANDOFF_PRODUCT_SECRET`
- `FORESIGHT_SESSION_SECRET`

`FORESIGHT_SESSION_SECRET` must satisfy the product session helper's minimum
length requirement.

## Human-required blockers

The next positive smoke needs the user/operator to confirm or perform:

- Core and Foresight production env names are configured with matching product
  credential material.
- Core issue/redeem feature flags are enabled for Foresight.
- Foresight handoff feature flag is enabled.
- The QA account can sign in to Core and has active Foresight product access.
- The operator explicitly approves a positive browser handoff smoke that may
  create and consume one `openclaw.auth_handoff_codes` row and write audit or
  operator events.

## Allowed safe checks before approval

These can be done without creating a handoff row:

- No-session Foresight page redirect checks.
- No-session Foresight API 401 checks.
- Core start route no-session redirect check.
- Core redeem missing/invalid credential fail-closed checks.
- Dashboard/env-name presence confirmation by the operator without sharing values.
- SELECT-only row count checks if separately approved.

## Forbidden until approval

- Valid Core authenticated start flow.
- Handoff code generation.
- Product credential use.
- Handoff redeem.
- SQL writes or cleanup.
- Auth/DB data mutation.
- Secret, token, cookie, session, raw code, code hash, credential, signed URL, or
  raw provider response output.

## Next gate

Recommended next gate:

- `Foresight-Handoff-12 positive flow runtime setup confirmation`

This gate should be operator-driven. It should collect only sanitized readiness
facts and must not ask for or print secret values.
