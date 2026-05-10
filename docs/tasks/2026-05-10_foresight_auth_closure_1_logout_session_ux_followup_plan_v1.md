# Foresight-Auth-Closure-1 Logout Session UX Follow-up Plan v1

Date: 2026-05-10
Status: planned
Scope: Foresight logout and session UX follow-up after positive Core handoff

## Verdict

Decision: PLAN_NEXT

The MVP Core-to-Foresight handoff path is operational. The next product-auth
polish area is Foresight logout and session-expiry UX.

This plan keeps the work inside Foresight operator UI/auth boundaries. It must
not change benchmark import, Meta API, Python retrain, prediction model logic,
DB schema, or Core handoff schema.

## Current State

Observed implementation:

- Foresight stores a product-local httpOnly session cookie after successful
  handoff.
- Protected pages use `requireForesightPageSession()`.
- Protected APIs use `requireForesightApiSession()`.
- Handoff callback clears the Foresight session cookie on disabled, invalid,
  or expired handoff outcomes.
- `clearForesightSessionCookie()` already exists in
  `lib/auth/foresightSession.ts`.

Missing or not yet verified:

- explicit user-facing logout route
- visible logout affordance in the protected UI
- post-logout redirect behavior
- no-session API behavior after logout
- session-expiry copy across protected pages and login shell
- production logout smoke

## Recommended Implementation Scope

### 1. Logout route

Candidate route:

```text
POST /api/auth/logout
```

Behavior:

- clear `admate_foresight_session`
- return a minimal success JSON response
- add `Cache-Control: no-store`
- do not call Core logout
- do not print or return cookie/session values

Candidate response:

```json
{ "success": true }
```

Optional page route:

```text
GET /logout
```

If added, it should clear the cookie and redirect to:

```text
/login
```

### 2. Protected UI logout affordance

Candidate placement:

- top navigation right side, near account or product navigation

Recommended label:

```text
로그아웃
```

Expected behavior:

- calls `POST /api/auth/logout`
- on success, navigates to `/login`
- on failure, still navigates to `/login` after clearing local UI state where
  applicable

Do not expose:

- session payload
- cookie name/value
- Core account id
- handoff code
- product credential

### 3. Session-expiry UX

Current fail-closed behavior should remain:

- protected pages redirect to `/login?next=<safe-path>`
- protected APIs return `401` with `Authentication required.`

Recommended visible copy on login shell when redirected after expiry:

```text
로그인 상태가 만료되었습니다. 다시 로그인해 주세요.
```

This should be driven by a safe query flag only if the guard can add it without
leaking session state. If not, keep the current generic login shell and defer
explicit expiry copy.

## Verification Plan

Local checks:

- `npx tsc --noEmit`
- `npm run build`
- `npm run benchmark:dry-run`
- `git diff --check`
- no secret-like output in authored files

No-session smoke:

- `/` redirects to `/login?next=%2F`
- `/trends` redirects to `/login?next=%2Ftrends`
- `GET /api/trends` returns `401`
- `POST /api/auth/logout` returns `200` and no sensitive payload

Authenticated smoke, if separately approved:

- login through Core handoff
- protected page renders
- logout button visible
- logout returns to `/login`
- refreshing `/trends` after logout redirects to login
- API after logout returns `401`

## Stop Conditions

Stop if:

- implementation requires reading cookies or session values
- implementation requires changing Core handoff schema
- implementation requires benchmark import/upload
- implementation requires Meta API or Python retrain
- logout route exposes cookie/session/token/code/product credential values
- product UI needs broader design decisions beyond a simple account/logout
  affordance

## No-Touch Boundaries

Do not change:

- `app/api/meta-sync`
- `app/api/py-retrain`
- benchmark import/upload logic
- prediction model logic
- DB schema
- env values
- Core handoff table
- product assets

## Next Gate

`Foresight-Auth-Closure-2 logout UX implementation`

This gate can be implemented without SQL or dashboard changes. Production
authenticated logout smoke should remain a separate approval gate if it requires
operator login.
