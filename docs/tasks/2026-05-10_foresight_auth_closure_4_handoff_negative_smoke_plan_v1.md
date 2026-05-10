# Foresight-Auth-Closure-4 Handoff Negative Smoke Plan v1

Date: 2026-05-10
Status: planned
Scope: Foresight handoff invalid/expired UX smoke planning

## Verdict

Decision: PLAN_SAFE_NEGATIVE_SMOKE_ONLY

The next safe QA step is to verify Foresight login-shell handling for invalid
or unavailable handoff states without capturing, replaying, or printing a real
handoff code.

Real replay testing should remain deferred unless a separate secure harness is
approved, because it would require handling a code-bearing callback URL.

## Safe Negative Smoke Scope

Allowed production-safe checks:

### 1. Missing code

Target shape:

```text
https://foresight.admate.ai.kr/auth/handoff?next=/trends
```

Expected:

- redirect to `/login?next=%2Ftrends&handoff=invalid`
- login screen shows `로그인 연결을 완료할 수 없습니다. 다시 시도해 주세요.`
- Foresight session cookie is cleared by the route
- no raw code is present

### 2. Clearly invalid code

Target shape:

```text
https://foresight.admate.ai.kr/auth/handoff?code=invalid&next=/trends
```

Expected:

- redirect to `/login?next=%2Ftrends&handoff=invalid`
- same invalid handoff copy
- no call to Core redeem should be needed because local code shape validation
  fails first

### 3. Disabled-like configuration copy

This should not be forced in production by changing env values. It can be
covered by existing historical result if needed, or by local env-only smoke in a
future gate.

## Deferred Riskier Smoke

Deferred unless separately approved:

- replaying a once-used handoff code
- capturing a real callback URL
- printing or storing any raw handoff code
- inspecting code hash rows
- querying production handoff rows for lifecycle details
- shortening session TTL in production

Reason:

These tests could expose or mishandle a one-time credential-like value. They
should be done only through a dedicated secure harness that records sanitized
state and never exposes the raw code.

## Verification Plan

For the safe negative smoke:

- run at most one request per allowed target
- record only status and sanitized final route
- confirm visible login copy
- do not record cookies, session values, handoff codes, code hashes, tokens,
  product credentials, env values, or raw provider payloads

Local verification before production is optional:

- `npx tsc --noEmit`
- `npm run build`
- `npm run benchmark:dry-run`

## Stop Conditions

Stop if:

- a URL contains a real handoff code
- a response exposes cookie/session/token/code/product credential values
- the smoke would require SQL execution
- the smoke would require DB/Auth mutation
- the smoke would require env changes
- the smoke would require Core code changes

## Next Gate

`Foresight-Auth-Closure-5 invalid handoff production-safe smoke`

This can proceed without operator login because it uses only missing or clearly
invalid code shapes.
