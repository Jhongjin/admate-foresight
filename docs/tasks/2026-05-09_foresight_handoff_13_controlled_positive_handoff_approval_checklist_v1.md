# Foresight-Handoff-13 Controlled Positive Handoff Approval Checklist v1

Date: 2026-05-09
Status: approval checklist only
Scope: pre-approval checklist for one controlled Core-to-Foresight positive handoff smoke

## Purpose

This document defines the human/operator approvals required before running a
positive production Core-to-Foresight handoff smoke.

It does not approve or execute the smoke by itself.

## Current Baseline

Confirmed before this checklist:

- Foresight production no-session page guard smoke passed.
- Foresight production API guard smoke passed.
- Foresight `/auth/handoff` without code fails closed to login.
- Core start route and redeem API negative production-safe smoke passed.
- Production `openclaw.auth_handoff_codes` schema apply was recorded as pass.
- Foresight positive handoff readiness audit remains blocked for human runtime setup.

## Required Approval Text

Before executing the positive smoke, the operator should explicitly approve:

```text
AdMate Core production to Foresight production controlled positive handoff smoke를 1회 승인한다.
```

The approval must be for exactly one attempt unless a separate retry approval is
given.

## Required Runtime Confirmation

The operator must confirm the following without sharing values:

- Core production handoff issue flag is enabled for Foresight.
- Core production handoff redeem flag is enabled for Foresight.
- Core production Foresight product credential material is configured.
- Foresight production handoff feature flag is enabled.
- Foresight production Core base URL points to the approved Core production origin.
- Foresight production product credential matches Core server-side expectation.
- Foresight production session signing secret is configured and meets minimum length.
- The QA account can sign in to Core.
- The QA account has active Foresight product access.

No env values, secret values, tokens, cookies, session values, raw handoff codes,
code hashes, or product credentials should be copied into chat, docs, terminal
output, screenshots, or logs.

## Exact Smoke Boundary

Allowed once approved:

- one browser session
- one Core authenticated start flow
- one redirect to Foresight `/auth/handoff`
- one server-side redeem from Foresight to Core
- one product-local Foresight session cookie creation
- one landing on the requested protected Foresight path

Expected side effects:

- one production `openclaw.auth_handoff_codes` row may be created
- that row may be consumed
- Core audit/operator events may be written
- Foresight product-local session cookie may be set in the browser

## Sanitized Evidence To Record

Allowed evidence:

- start URL path without raw query code
- final Foresight path
- redirect status summary
- sanitized handoff row prefix/suffix if separately approved through SELECT-only review
- consumed status summary without raw code or code hash
- whether product-local session exists, without cookie value
- whether protected page rendered

Forbidden evidence:

- raw handoff code
- `code=` URL
- code hash
- product credential
- token, cookie, or session value
- env values
- signed URLs
- raw provider response
- full audit payload if it contains sensitive fields

## Stop Conditions

Stop immediately if any of these happen:

- approval text is missing or ambiguous
- Core login fails
- Foresight product access is unclear
- env/credential readiness is unclear
- raw code or cookie value appears in visible output
- product credential is requested in chat or terminal
- more than one handoff attempt would be required
- Foresight callback returns an unexpected 5xx
- SQL write, cleanup, delete, or manual row mutation appears necessary

## Forbidden During This Gate

- SQL execution
- DB cleanup/delete/revoke
- handoff retry without separate approval
- Meta API call
- Python retrain
- benchmark import/upload
- product code change
- Core code change
- env value output
- secret/token/cookie/session/raw code/code hash output

## Result Template

```text
Gate:
Approval text present:
Account:
Attempt count:
Start route:
Callback route:
Final path:
Handoff row side effect:
Redeem status:
Product-local session:
Protected page render:
Sensitive output review:
No-touch areas:
Decision:
Next Gate:
```

## Next Gate

`Foresight-Handoff-14 controlled positive handoff smoke`

This next gate must stop for operator participation before execution.
