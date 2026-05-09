# Foresight-Auth-7 Shared Session Feasibility Audit v1

Date: 2026-05-09
Status: read-only audit completed
Repo: admate-foresight
Related repos: admate-agent-core
Depends on: `Foresight-Auth-6 session provider contract plan`

## 1. Goal

Audit whether AdMate Foresight can use an Agent Core shared session for product page access and account read behavior.

This Gate is read-only except for this documentation artifact.

Explicitly not performed:

- No code modification.
- No Auth mutation.
- No DB mutation.
- No SQL execution.
- No mail, invite, or reset-password send.
- No benchmark import or upload.
- No Meta API call.
- No Python retrain execution.
- No stage, commit, or push.
- No secret, token, cookie value, provider raw response, or raw campaign data output.

## 2. Reviewed Surface

Foresight repo:

| File | Current role |
| --- | --- |
| `lib/auth/foresightAuth.ts` | Foresight safe `next` sanitizer, login path builder, account lifecycle links, generic auth-required body |
| `lib/auth/foresightPageGuard.ts` | fail-closed page guard that redirects all protected pages to `/login?next=<path>` |
| `app/login/page.tsx` | product-local login shell; no login mutation or session creation |
| `app/reset-password/page.tsx` | public reset-password shell linking to central reset path |
| `app/account/page.tsx` | account shell protected by the fail-closed page guard |

Agent Core repo:

| File | Current role |
| --- | --- |
| `src/app/login/page.tsx` | Agent Core login page using Supabase browser sign-in |
| `src/proxy.ts` | route-level session gate using Supabase SSR server client |
| `src/lib/supabase/server.ts` | server Supabase client with cookie adapter |
| `src/lib/supabase/client.ts` | browser Supabase client |
| `src/app/api/auth/me/route.ts` | read-only authenticated session/profile probe |
| `src/app/api/account/me/route.ts` | read-only account payload endpoint |
| `src/app/api/auth/logout/route.ts` | logout route |
| `src/lib/account/account-me.ts` | sanitized account payload construction and product access mapping |
| `src/lib/supabase/session-actor.ts` | Agent Core server-side active actor helper |
| `docs/tasks/2026-05-09_auth_product_login_7_rollout_status_audit_v1.md` | Agent Core product login rollout audit |

Search note:

- The bundled `rg` executable was unavailable in this desktop session due a local execution permission issue, so read-only discovery used PowerShell `Get-ChildItem`, `Get-Content`, and `Select-String`.

## 3. Current Foresight Auth State

Current state:

| Surface | State |
| --- | --- |
| `/login` | public product shell only |
| `/reset-password` | public shell only |
| `/account` | protected by fail-closed guard |
| `/`, `/trends`, `/insights`, `/competitor` | protected by fail-closed page guard |
| benchmark upload/dry-run/reviewer APIs | not implemented in current Auth Gate |
| meta-sync/py-retrain | existing internal-key guard model remains separate |
| export/debug | disabled behavior remains separate |

The Foresight page guard currently has no authenticated pass-through branch. Any protected page calls `requireForesightPageSession(path)` and is redirected to `/login?next=<safe path>`.

The Foresight login shell preserves the approved product copy:

- `AdMate Foresight 로그인`
- `성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요`

The Foresight `next` sanitizer is product-local and allows only approved same-origin product paths. It rejects protocol-relative URLs, backslashes, `/api` paths, unknown product paths, overlong values, and sensitive query keys.

## 4. Agent Core Session and Account Surface

Agent Core has a working Supabase Auth-based login/session surface:

| Surface | Observed behavior |
| --- | --- |
| `/login` | signs in through the Supabase browser client and redirects to sanitized `next` |
| `src/proxy.ts` | uses Supabase SSR to read session cookies and redirects protected pages to `/login` |
| `/api/auth/me` | returns authenticated state and a profile probe with no-store headers |
| `/api/account/me` | returns a sanitized account payload; no session returns `401` |
| `/api/auth/logout` | signs out through the server Supabase client |

Agent Core account payload support is relevant to Foresight:

- `account-me` product mapping includes `foresight` as `AdMate Foresight`.
- Foresight product href is currently blank in the Agent Core product link map.
- `/api/account/me` includes product access and next action concepts that could become the account read source for Foresight.
- The account helper excludes raw provider/session-style fields from the response model.

## 5. Cookie / Session Policy Findings

Observed code-level cookie handling:

| Area | Finding |
| --- | --- |
| Agent Core server client | uses `@supabase/ssr` cookie adapter and passes cookie options from Supabase SSR |
| Agent Core proxy | reads request cookies and writes response cookies through Supabase SSR |
| Explicit cookie domain | not found in inspected Agent Core session code |
| Explicit cookie path | not found in inspected Agent Core session code |
| Explicit SameSite policy | not found in inspected Agent Core session code |
| Explicit shared parent-domain policy | not found in inspected Agent Core session code |

Interpretation:

```text
Agent Core has a local session implementation, but the inspected code does not define a confirmed cross-domain shared cookie contract for Foresight.
```

Because browser cookies are host-scoped unless configured otherwise, Foresight must not assume it can read Agent Core/Sentinel cookies server-side from a different product host.

## 6. Can Foresight Server-side Verify Agent Core Session Today?

Current answer:

```text
not confirmed / blocked for direct shared-cookie use
```

Why:

- Foresight has no server-side session reader.
- Foresight has no Agent Core session introspection client.
- Agent Core does not expose a documented Foresight-facing session verification contract in the inspected code.
- The inspected cookie handling does not prove a shared parent-domain cookie, SameSite, Secure, HttpOnly, or path policy that Foresight can rely on.
- Agent Core `/api/account/me` is same-origin oriented from Agent Core's account page; using it from Foresight would require an explicit cross-origin or server-to-server contract.

Foresight should keep the Auth-5 fail-closed page guard until one of the provider contracts is explicitly implemented and verified.

## 7. Cross-domain Cookie Sharing Feasibility

Direct cross-domain cookie sharing is not currently ready as the Foresight session model.

Required before it could be considered:

| Requirement | Status |
| --- | --- |
| final product domains | partially implied by product URLs, but not a session contract |
| cookie domain policy | not found |
| cookie path policy | not found |
| SameSite/Secure/HttpOnly policy | not found in product contract form |
| logout invalidation behavior across products | not defined for Foresight |
| account/product access claim source | available conceptually in Agent Core, not wired to Foresight |
| server-side verification behavior | not implemented in Foresight |
| CORS/credentials policy for browser account fetch | not defined |

Risk:

- Setting a broad parent-domain cookie could unintentionally expose session authority to unrelated or weaker product hosts.
- Keeping host-only cookies prevents Foresight from seeing Agent Core session state.
- Both paths need an explicit product security decision rather than an implicit assumption.

## 8. Candidate Auth Directions

### 8.1 Shared Session

Description:

- Agent Core issues a session cookie/token that Foresight can verify server-side.

Current feasibility:

```text
blocked_until_cookie_or_introspection_contract_exists
```

Notes:

- This remains the desired platform direction only if the shared session contract is explicit.
- It should not be implemented by merely broadening cookie scope without a threat review.

### 8.2 Product-local Session

Description:

- Foresight uses its own Supabase Auth session helper and product-local cookie/session flow.

Current feasibility:

```text
possible_but_requires_separate_auth_db_env_approval
```

Notes:

- This would be straightforward for page guards, but may fragment identity/account governance.
- It requires Auth mutation, environment ownership, logout/reset behavior, and product access model approval.

### 8.3 Redirect-to-core Login

Description:

- Foresight `/login` sends the user to the central AdMate login/account lifecycle surface, then receives a verified return through a safe callback or server-side session exchange.

Current feasibility:

```text
recommended_direction_with_explicit_handoff_contract
```

Notes:

- This keeps Agent Core as the account lifecycle authority.
- It avoids assuming raw cross-domain cookie readability.
- It still needs a signed, short-lived handoff or server-side introspection contract before Foresight can open protected pages.

## 9. Recommended Direction

Recommended implementation direction:

```text
redirect-to-core login with explicit server-side session exchange or introspection
```

Do not use:

```text
implicit shared cookie assumption
```

Fallback if the central handoff is not ready:

```text
product-local Supabase session, only after explicit Auth/DB/env approval
```

Reasoning:

- Agent Core already owns account lifecycle, product access concepts, and a sanitized account read model.
- Foresight currently has only a login shell and fail-closed page guard.
- The inspected Agent Core code does not prove that a shared cross-domain cookie can be safely read by Foresight.
- A redirect plus explicit handoff/introspection contract is safer than widening cookie scope as an implementation shortcut.

## 10. Future Foresight `/login` Behavior

Recommended future behavior:

1. Read and sanitize `next` using `sanitizeForesightNextPath()`.
2. Link or redirect to the Agent Core central login entry with an allowlisted return target.
3. After Agent Core authentication, use a short-lived, server-verified handoff or introspection flow.
4. Set only the approved Foresight session state needed for server-side guards, or verify centrally on each request if that is the selected contract.
5. Redirect to the sanitized `next`.
6. On missing/invalid/expired authority, fail closed back to `/login?next=<path>`.

Do not:

- pass access tokens in query strings.
- log cookie or authorization headers.
- trust `next` from Agent Core or Foresight without sanitizer checks.
- open Foresight protected pages based only on a client-side flag.
- expose provider raw errors in the login shell.

## 11. `/account` Read Model Direction

Preferred source:

```text
Agent Core account model as source of truth
```

Recommended Foresight pattern:

- Use Agent Core account/product access data through a server-side contract.
- Foresight may render a Foresight-specific account shell with only sanitized fields.
- Foresight may later add a thin local API proxy only if it does not become the source of truth.

Required sanitized account fields:

| Field | Purpose |
| --- | --- |
| display name | optional UI label |
| masked email | optional user confirmation |
| Foresight access status | allowed / pending / denied |
| Foresight product role | viewer / planner / reviewer / admin |
| access request link | account recovery or request CTA |

Forbidden account output:

- token values.
- cookie values.
- provider raw user object.
- service credentials.
- raw membership rows.
- other products' sensitive authorization details.
- raw audit rows.

## 12. Security Risk Review

| Risk | Level | Finding | Required control |
| --- | --- | --- | --- |
| token leakage | P0 | central redirect or callback could leak tokens if query strings are used incorrectly | never place tokens/cookies in URLs; use one-time code or server-side exchange |
| open redirect | P0 | both central and product `next` parameters can become redirect vectors | strict same-origin/product allowlist; reject protocol-relative and `/api` targets |
| cross-domain cookie scope | P1 | broad parent-domain cookies may overexpose session authority | explicit domain/SameSite/Secure/HttpOnly review before any shared cookie |
| stale session | P1 | Foresight could accept a session after central logout if not verified | short expiry, central introspection, logout invalidation contract |
| super_admin only bypass | P1 | an Agent Core admin role should not automatically grant Foresight product access | require product access claim/membership, not system role alone |
| provider raw response exposure | P1 | Agent Core account/session APIs contain data that must stay sanitized | Foresight must use sanitized contract only |
| account API cross-origin misuse | P2 | browser fetch with credentials can fail or broaden CORS if rushed | prefer server-side contract; fail closed |

## 13. Decision

Current decision:

```text
shared_session_not_ready_as_direct_cookie_contract
```

Recommended path:

```text
redirect_to_core_login_with_explicit_session_handoff_contract
```

Fallback:

```text
product_local_session_only_if_central_handoff_is_blocked_and_approved
```

Continue to keep:

- Foresight page guard fail-closed.
- `/login` and `/reset-password` public.
- meta-sync/py-retrain internal-key guards unchanged.
- export/debug routes disabled.
- benchmark upload/dry-run/reviewer API guard work deferred.

## 14. Implementation Implications

Foresight should not open authenticated routes until a later Gate defines and implements:

- central login redirect URL and return allowlist.
- one-time handoff or introspection endpoint contract.
- Foresight server-side verifier.
- product access claim mapping for Foresight.
- `/account` sanitized read model.
- logout behavior.
- no-session and expired-session smoke tests.

Candidate Foresight implementation files for a later Gate:

| File | Role |
| --- | --- |
| `lib/auth/foresightSession.ts` | server-side session handoff/introspection verifier |
| `lib/auth/foresightPageGuard.ts` | open protected pages only for verified Foresight access |
| `app/login/page.tsx` | central login redirect or handoff start |
| `app/account/page.tsx` | sanitized account read shell |
| `app/api/auth/callback/route.ts` | optional handoff callback, if approved |
| `app/api/auth/logout/route.ts` | optional central logout bridge, if approved |

Do not implement benchmark/API guards in the same Gate as central session wiring unless explicitly approved.

## 15. Verification Plan For Future Implementation

Static:

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- `npm run benchmark:dry-run`
- secret pattern scan.
- forbidden copy scan for raw provider/internal wording.

No-session smoke:

| Route | Expected |
| --- | --- |
| `/` | `/login?next=%2F` |
| `/trends` | `/login?next=%2Ftrends` |
| `/insights` | `/login?next=%2Finsights` |
| `/competitor` | `/login?next=%2Fcompetitor` |
| `/account` | `/login?next=%2Faccount` |
| `/login` | public |
| `/reset-password` | public |

Authenticated smoke after contract implementation:

| State | Expected |
| --- | --- |
| valid central session + Foresight access | protected page renders |
| valid central session + no Foresight access | access request or denied state |
| expired central session | redirect to login |
| central introspection unavailable | fail closed |
| callback with invalid or reused handoff code | fail closed |

Regression checks:

- `/api/meta-sync` remains internal-key guarded.
- `/api/py-retrain` remains internal-key guarded.
- `/api/export` remains disabled.
- `/api/debug-env` remains disabled.
- `/api/debug-data` remains disabled.
- benchmark dry-run remains local/mock-only and does not import raw data.

## 16. Next Gate Suggestions

Recommended next Gates:

1. `Foresight-Auth-8 central login handoff contract plan`
2. `Agent-Core-Auth-Foresight-1 session introspection or handoff contract plan`
3. `Foresight-Auth-9 account read model contract plan`
4. `Foresight-Auth-10 authenticated page guard implementation`

Do not proceed directly to authenticated page pass-through until the central handoff or product-local session contract is approved.
