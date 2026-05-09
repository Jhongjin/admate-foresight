# Foresight-Handoff-2 Callback Session Implementation Plan

Date: 2026-05-09
Repo: admate-foresight
Gate: Foresight-Handoff-2
Status: plan only

## Decision

Foresight should implement Core product handoff as a product-local callback and session layer, not as cross-domain shared cookie auth.

Recommended MVP:

- Core browser start route: `https://sentinel.admate.ai.kr/auth/product/start?product=foresight&next=<safe-path>`
- Foresight callback route: `/auth/handoff`
- Foresight server-side redeem call to Core
- Foresight product-local httpOnly session cookie after successful redeem
- Existing fail-closed page guard opens only when the product-local session is valid

Current Foresight pages remain fail-closed until the callback/session implementation is complete.

## Current Local State

Observed files:

- `lib/auth/foresightAuth.ts`
- `lib/auth/foresightPageGuard.ts`
- `app/login/page.tsx`
- `app/account/page.tsx`
- `app/page.tsx`
- `app/trends/page.tsx`
- `app/insights/page.tsx`
- `app/competitor/page.tsx`

Current behavior:

- `/login` is a product shell with a disabled "AdMate account" button.
- `sanitizeForesightNextPath()` allows `/`, `/trends`, `/insights`, `/competitor`, and `/account`.
- `requireForesightPageSession()` always redirects to `/login?next=...`.
- `/`, `/trends`, `/insights`, `/competitor`, and `/account` are fail-closed.
- There is no product-local session cookie yet.
- There is no Foresight callback route yet.

## Proposed Browser Flow

1. User opens a protected Foresight route.
2. Foresight redirects to `/login?next=<safe-path>`.
3. User clicks "AdMate account" on the Foresight login shell.
4. Browser navigates to Core:
   `/auth/product/start?product=foresight&next=<safe-path>`.
5. Core validates the Core browser session.
6. Core issues one one-time handoff code and stores only the code hash.
7. Core redirects to the allowlisted Foresight callback:
   `/auth/handoff?code=<one-time-code>&next=<safe-path>`.
8. Foresight callback redeems the code server-side with Core.
9. On successful redeem, Foresight creates a product-local httpOnly session.
10. Foresight redirects to the sanitized `next` path.

Raw handoff code must only exist at the redirect/redeem boundary and must not be logged, stored, or written to docs.

## Route Plan

### `/auth/handoff`

Recommended route type: server route/page handler that can read query params and set cookies.

Responsibilities:

- Accept `code` and `next` query params.
- Sanitize `next` with the existing Foresight allowlist.
- Reject missing or malformed `code` with a safe error UX.
- Call Core redeem endpoint from the server.
- Use product server credential from environment, but never print it.
- Create a product-local httpOnly session only after successful redeem.
- Redirect to sanitized `next`.

Expected failure UX:

- Missing code: show "로그인 연결을 완료할 수 없습니다. 다시 시도해 주세요."
- Redeem rejected: show "로그인 확인이 만료되었습니다. 다시 로그인해 주세요."
- Product handoff disabled: show "로그인 연결이 아직 준비되지 않았습니다."

### `/login`

Change the disabled button into a link/button to Core start route.

Rules:

- Preserve current Foresight copy.
- Preserve `next` display only as sanitized path.
- Never place token, session, credential, or raw code in copy/logs.
- For non-allowed `next`, fallback to `/`.

### `/account`

After product-local session exists, `/account` can show a read-only sanitized account view.

Recommended fields:

- display name or email prefix if available
- product access status
- role label, if included in redeemed payload
- last login/session expiry display only if sanitized

Do not show raw Core payload, provider fields, tokens, cookies, or internal ids unless explicitly sanitized.

## Session Cookie Plan

Use a Foresight-local httpOnly cookie.

Candidate properties:

- name: `admate_foresight_session`
- httpOnly: true
- secure: true in production
- sameSite: `lax`
- path: `/`
- maxAge: aligned with Core handoff session payload or shorter

Session payload options:

1. Signed/encrypted compact product session stored in cookie.
2. Opaque session id in cookie with server-side lookup.

MVP recommendation:

- Prefer signed/encrypted compact session only if the repo already has a safe signing helper.
- Otherwise plan a small product session helper and defer broader account/session persistence.

Do not store raw Core token, raw provider response, product credential, or handoff code in the cookie.

## Page Guard Plan

Replace `requireForesightPageSession()` hard redirect with a real product-local session check.

Expected behavior:

- no product session: redirect to `/login?next=<path>`
- valid product session: render page
- expired/invalid session: clear local session and redirect to login

Affected pages:

- `/`
- `/trends`
- `/insights`
- `/competitor`
- `/account`

Public pages:

- `/login`
- `/reset-password`
- `/auth/handoff` callback route
- static assets

## API Guard Follow-Up

This gate does not implement API guards.

Future API policy should protect product read/action APIs after page session is working:

- prediction and aggregate read APIs: protect by default
- external lookup APIs: session guard before provider/rate-limit work
- benchmark upload/dry-run/reviewer flows: separate benchmark auth gate
- `meta-sync` and `py-retrain`: keep existing internal-key and dry-run safeguards
- disabled export/debug routes: keep disabled

## Environment and Config Candidates

Potential env names, to be finalized in implementation gate:

- `ADMATE_CORE_BASE_URL`
- `FORESIGHT_HANDOFF_PRODUCT_SECRET`
- `FORESIGHT_SESSION_SECRET`
- `FORESIGHT_AUTH_HANDOFF_ENABLED`

Do not print values. Implementation and verification must only report whether required config is present.

## Security Boundaries

Required:

- server-side redeem only
- product credential only on server
- callback allowlist remains owned by Core
- `next` remains Foresight path-only
- raw code never stored
- token/cookie/session/raw provider response never printed
- fail-closed behavior if config is missing
- no open redirect

Stop conditions:

- callback receives external `next`
- redeem response includes unexpected raw provider data
- product credential is requested in browser code
- valid session would require exposing token/cookie values
- implementation requires DB/schema mutation not planned in this gate

## Implementation Candidate Files

Likely Foresight files:

- `app/auth/handoff/route.ts` or `app/auth/handoff/page.tsx`
- `app/login/page.tsx`
- `lib/auth/foresightAuth.ts`
- `lib/auth/foresightPageGuard.ts`
- `lib/auth/foresightSession.ts`
- optional test script for sanitizer/session/callback static checks

Do not modify in this planning gate.

## Verification Plan for Implementation Gate

Local/static checks:

- `npx tsc --noEmit`
- `npm run build`
- `npm run benchmark:dry-run`
- static scan for raw token/cookie/session/provider/code output
- sanitizer cases for `next`
- no-session page redirect smoke
- missing config fail-closed smoke

Integration checks, only after explicit approval:

- isolated browser login through Core start route
- single handoff callback attempt
- verify product-local session opens `/`
- verify `/trends`, `/insights`, `/competitor`, `/account`
- verify logout/session expiry if implemented

## Recommended Next Gate

Gate Foresight-Handoff-3 callback/session implementation plan review or minimal implementation.

Recommended implementation scope:

- Foresight callback route
- Foresight local session helper
- login button to Core start route
- page guard session check
- no API guard yet

Forbidden until later:

- SQL execution
- DB/schema change
- benchmark import/upload
- Meta API call
- Python retrain
- production valid handoff flow without explicit QA approval
