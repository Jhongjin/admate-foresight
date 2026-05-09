# Foresight-Auth-6 Session Provider Contract Plan v1

Date: 2026-05-09
Status: contract plan only
Repo: admate-foresight
Depends on: `Foresight-Auth-5 page guard implementation`

## 1. Goal

Design the session provider contract needed to move Foresight page guards from the current fail-closed behavior to authenticated access.

This Gate is documentation only.

Explicitly not performed:

- No code implementation.
- No Auth mutation.
- No DB mutation.
- No SQL execution.
- No mail, invite, or reset-password send.
- No benchmark import or upload.
- No Meta API call.
- No Python retrain execution.
- No stage, commit, or push.
- No environment, secret, token, credential, cookie, session, provider raw response, or raw campaign data output.

## 2. Current Foresight Auth State

Current implemented foundation:

| File | Current state |
| --- | --- |
| `lib/auth/foresightAuth.ts` | safe `next` sanitizer, login path builder, external account lifecycle links, generic auth-required JSON body |
| `lib/auth/foresightPageGuard.ts` | fail-closed page guard; always redirects to `/login?next=<path>` |
| `app/login/page.tsx` | product-local login shell; no provider login mutation |
| `app/reset-password/page.tsx` | public shell linking to external reset path |
| `app/account/page.tsx` | protected by fail-closed guard |
| product pages | protected by fail-closed guard |
| API routes | unchanged; API guard deferred |

Current page guard behavior:

```text
protected page -> requireForesightPageSession(path) -> redirect(/login?next=<path>)
```

There is no authenticated pass-through path yet.

## 3. Existing Supabase / Auth Helper Inventory

Detected Foresight helpers:

| File | Purpose | Auth/session relevance |
| --- | --- | --- |
| `lib/supabase.ts` | creates basic Supabase client with public/anon env names | data client only; no user session helper |
| `lib/xlsxLoader.ts` | loads aggregate benchmark data from Supabase RPC | data loading only |
| `lib/metaSync.ts` | writes Meta rows when high-risk execution path is explicitly enabled | operation helper; not user session |
| `lib/security.ts` | internal-key guard for high-risk routes | operator/internal execution guard; not product user session |
| `lib/auth/foresightAuth.ts` | Foresight login shell utilities | sanitizer/link/error body only |
| `lib/auth/foresightPageGuard.ts` | page guard | fail-closed placeholder |

Not currently detected:

- user session cookie reader.
- Supabase Auth server session helper.
- login submit/action route.
- logout route.
- product membership helper.
- account read helper.
- Agent Core account/session API consumer.
- cross-domain session verification helper.

Conclusion:

```text
Foresight has Supabase data access, but no product user auth/session layer.
```

## 4. Session Provider Options

### 4.1 Option A: Agent Core Shared Session

Concept:

- Agent Core/Homepage/Sentinel owns identity, account lifecycle, product access, and session issuance.
- Foresight verifies a shared AdMate session using a server-side contract.

Potential mechanisms:

- shared cookie under an agreed AdMate parent domain.
- server-to-server session introspection endpoint.
- signed session token verified locally using a published key or shared secret.
- short-lived session exchange from Agent Core to Foresight.

Benefits:

- one AdMate identity surface across products.
- product access can be centrally governed.
- Foresight avoids owning user lifecycle mutation.
- `/access-request`, reset-password, and account source can remain central.

Risks / blockers:

- cross-domain cookie domain and SameSite policy must be defined.
- Foresight domain and Agent Core/Homepage/Sentinel domains must be final.
- token/cookie verification contract must be explicit.
- product access claim format must be stable.
- outage behavior must fail closed.

Recommendation:

```text
Preferred long-term direction.
```

### 4.2 Option B: Product-local Supabase Auth Session

Concept:

- Foresight uses Supabase Auth directly for login/session.
- Login route sets a Supabase Auth session cookie for this product.
- Page guard checks Supabase Auth server-side.

Benefits:

- can be implemented product-locally.
- aligns with existing Supabase dependency.
- fewer cross-product coordination points for a short-term MVP.

Risks / blockers:

- may fragment AdMate identity and access governance.
- account lifecycle and access request may diverge from Agent Core.
- product roles may require Foresight-owned tables or RPCs.
- Auth/DB mutation and env setup would require separate approval.
- cookie/session names and provider internals must remain hidden from UI/logs.

Recommendation:

```text
Use only as a temporary bridge if Agent Core session contract is not ready and product owner approves identity fragmentation risk.
```

### 4.3 Option C: Internal Header / Static Gate

Concept:

- Access is controlled by internal header, static operator key, or deployment-level gate.

Benefits:

- simple to block casual access.
- useful for internal smoke or preview environments.

Risks / blockers:

- not a real product login.
- no account surface.
- no per-user product access.
- unsuitable for ordinary user flows.

Recommendation:

```text
Do not use as the product auth model. Use only for temporary preview protection if needed.
```

## 5. Recommended Contract Direction

Preferred contract:

```text
Agent Core shared session with Foresight server-side verification.
```

Fallback contract:

```text
Product-local Supabase Auth session only if Agent Core contract is unavailable and explicitly approved.
```

Rejected as product auth:

```text
Internal-key/static header as ordinary user auth.
```

## 6. Agent Core Shared Session Contract Candidate

Foresight needs the following contract from Agent Core/Homepage/Sentinel.

### 6.1 Session Cookie / Token Contract

Required fields:

| Field | Requirement |
| --- | --- |
| cookie/token presence | server-readable by Foresight |
| issuer | stable AdMate issuer |
| subject | stable user id or account id |
| expiry | short enough for risk; long enough for product UX |
| product access claim | includes Foresight access status or points to introspection |
| signature/verification | verifiable without logging token |
| rotation policy | documented |
| logout invalidation | documented |

Do not require Foresight to read or display token values.

### 6.2 Server-side Introspection Contract

Candidate request:

```text
GET /internal/session/introspect
Authorization: server-to-server authority
Cookie: forwarded user session cookie, if contract allows
```

Candidate sanitized response:

```json
{
  "authenticated": true,
  "user": {
    "id": "opaque_user_id",
    "displayName": "optional_display_name",
    "emailMasked": "u***@example.com"
  },
  "products": {
    "foresight": {
      "access": "allowed",
      "role": "viewer"
    }
  },
  "expiresAt": "timestamp"
}
```

Response must not include:

- access token.
- refresh token.
- provider raw user object.
- service credential.
- raw roles outside the product contract.
- raw account membership rows.

### 6.3 Product Access States

Required Foresight states:

| State | Meaning | Page behavior |
| --- | --- | --- |
| `allowed` | user can access Foresight | render protected page |
| `pending` | user requested access | show access pending/account state |
| `denied` | user is authenticated but not allowed | show access request state or `403` page |
| `unknown` | provider unavailable or no claim | fail closed |

Minimum roles:

| Role | Meaning |
| --- | --- |
| `viewer` | ordinary Foresight product access |
| `planner` | can use planning surfaces |
| `reviewer` | future benchmark review access |
| `admin` | future admin actions; not enough to bypass `meta-sync`/`py-retrain` internal key |

## 7. Product-local Supabase Session Contract Candidate

If local Supabase Auth is selected, Foresight needs:

| Requirement | Notes |
| --- | --- |
| Supabase Auth server helper | read user session in server components/routes |
| login action/API | creates session through approved Auth flow |
| logout action/API | clears product-local session |
| access table/RPC source | product access status without exposing raw provider details |
| `/account` read model | own user status only |
| reset-password flow | external or Supabase Auth email flow, separately approved |
| env ownership | documented, values never output |

Local Supabase Auth blockers:

- Auth/DB mutation approval.
- env setup approval.
- product membership schema decision.
- reset/invite email ownership.
- RLS policy review.

Do not implement product-local Supabase Auth until these are approved.

## 8. Login Route Contract

Current login route:

```text
/login?next=<safe path>
```

Future required behavior:

| Step | Required behavior |
| --- | --- |
| read `next` | use `sanitizeForesightNextPath()` |
| user submits login | call selected provider flow |
| provider success | session cookie/token is set through approved mechanism |
| redirect | redirect to sanitized `next` |
| provider failure | generic error; no provider internals |
| missing product access | show access request CTA |

If Agent Core shared session is selected:

- Foresight login shell may redirect to Agent Core/Homepage/Sentinel login with sanitized return URL.
- Agent Core sets the shared session according to the contract.
- Foresight verifies session on the returned protected route.

If product-local Supabase is selected:

- Foresight login action/API sets local Supabase Auth session.
- This requires a separate implementation Gate and Auth mutation approval.

## 9. Page Guard Contract

Target helper shape:

```text
requireForesightPageSession(path: string): Promise<ForesightSession>
```

Candidate return shape:

```ts
interface ForesightSession {
  authenticated: true;
  userId: string;
  displayName?: string;
  emailMasked?: string;
  productAccess: 'allowed' | 'pending' | 'denied';
  role: 'viewer' | 'planner' | 'reviewer' | 'admin';
}
```

Required behavior:

| Session state | Guard behavior |
| --- | --- |
| no cookie/session | redirect `/login?next=<path>` |
| invalid/expired session | redirect `/login?next=<path>` |
| verification error | fail closed to login or generic unavailable state |
| authenticated + allowed | render page |
| authenticated + pending | show access pending/account state |
| authenticated + denied | show access request/denied state |
| authenticated + unknown access | fail closed |

Current Auth-5 behavior remains acceptable until the provider contract is implemented:

```text
no provider contract -> all protected pages fail closed
```

## 10. Authenticated Path Open Conditions

Only open authenticated page access when all are true:

- session provider contract is selected and documented.
- server-side session verification is implemented.
- token/cookie values are never logged or rendered.
- product access claim/source is available.
- no-session behavior still redirects to login.
- invalid/expired session fails closed.
- `/account` does not expose provider raw objects.
- tests/smoke cover no-session and authenticated pass-through.
- `meta-sync` and `py-retrain` internal-key guards remain unchanged.
- export/debug routes remain disabled.

Do not open authenticated path based only on:

- presence of a query parameter.
- client-side localStorage.
- unauthenticated API response.
- internal operator key.
- env flag alone.
- provider token submitted by the browser.

## 11. No-session Fail-Closed Criteria

No-session fail-closed must remain the default if:

- session cookie/token is missing.
- session verification endpoint is unavailable.
- token signature cannot be verified.
- product access state is absent.
- user role cannot be mapped.
- provider response is malformed.
- provider contract version is unsupported.
- auth helper throws an unexpected error.

Expected behavior:

```text
protected page -> /login?next=<safe path>
protected API -> 401 JSON { "error": "Authentication required." }
```

API guard remains a later Gate.

## 12. Account Read Model Candidate

`/account` should eventually show a minimal read-only model:

```json
{
  "displayName": "optional",
  "emailMasked": "optional",
  "product": "foresight",
  "accessStatus": "allowed | pending | denied",
  "role": "viewer | planner | reviewer | admin",
  "accessRequestUrl": "external_url"
}
```

Allowed account fields:

- masked email.
- display name, if safe and approved.
- product access status.
- product role label.
- access request link.
- reset-password link.

Forbidden account fields:

- tokens.
- cookie names/values.
- provider raw object.
- service role details.
- internal membership table names in UI.
- raw audit events.
- other products' sensitive access details.

## 13. Token / Cookie Output Boundary

Never output:

- access token.
- refresh token.
- ID token.
- session cookie value.
- provider credential.
- service role key.
- internal API key.
- credential-bearing URL.
- raw `Cookie` header.
- raw `Authorization` header.

Allowed in docs/code comments:

- generic terms such as `session cookie`, `server-side verification`, `product access claim`.
- env variable names only when necessary.

Not allowed in user-facing UI:

- raw provider/Auth wording.
- token/cookie implementation details.
- internal role system names.

## 14. Implementation Candidate Files

### 14.1 Agent Core Shared Session Path

Candidate files:

| File | Purpose |
| --- | --- |
| `lib/auth/foresightSession.ts` | server-side session verification contract |
| `lib/auth/foresightPageGuard.ts` | open authenticated path when session is allowed |
| `lib/auth/foresightApiGuard.ts` | later API session guard |
| `app/login/page.tsx` | redirect or shell integration with central login |
| `app/account/page.tsx` | render read-only account model |
| `components/Navigation.tsx` | account/logout affordance, later |
| `app/api/auth/logout/route.ts` | optional local logout proxy if approved |

### 14.2 Product-local Supabase Session Path

Candidate files:

| File | Purpose |
| --- | --- |
| `lib/auth/foresightSupabaseSession.ts` | Supabase Auth server session helper |
| `app/api/auth/login/route.ts` | local login action/API, if approved |
| `app/api/auth/logout/route.ts` | local logout action/API, if approved |
| `app/login/page.tsx` | submit local login form |
| `app/account/page.tsx` | read own access status |

Requires separate approval:

- Auth mutation.
- env ownership.
- email/reset flow.
- DB/RLS schema for product access, if needed.

## 15. Verification Plan

Before implementation:

- confirm selected session provider.
- confirm Foresight domain/session cookie behavior.
- confirm product access claim shape.
- confirm account read model source.
- confirm logout/reset/access-request ownership.

Static verification:

- `git diff --check`
- `npx tsc --noEmit`
- `npm run build`
- secret pattern scan.
- forbidden UI copy scan.

No-session smoke:

| Request | Expected |
| --- | --- |
| `/` | `/login?next=%2F` |
| `/trends` | `/login?next=%2Ftrends` |
| `/insights` | `/login?next=%2Finsights` |
| `/competitor` | `/login?next=%2Fcompetitor` |
| `/account` | `/login?next=%2Faccount` |
| `/login` | public `200` |
| `/reset-password` | public `200` |

Authenticated smoke after implementation:

| State | Expected |
| --- | --- |
| valid session + Foresight allowed | protected pages render |
| valid session + pending access | access pending state |
| valid session + denied access | access request or denied state |
| invalid session | redirect to login |
| provider unavailable | fail closed |

Regression smoke:

- `/api/meta-sync` still requires internal key and explicit execution flags.
- `/api/py-retrain` still requires internal key and explicit execution flags.
- `/api/export` remains disabled.
- `/api/debug-env` remains disabled.
- `/api/debug-data` remains disabled.
- `npm run benchmark:dry-run` remains local mock-only with all side effects false.

## 16. Rollback Plan For Future Implementation

Rollback units:

| Change area | Rollback |
| --- | --- |
| session provider helper | revert session helper commit |
| page guard pass-through | revert page guard session check change to fail-closed |
| login provider integration | revert login action/redirect integration |
| account read model | revert account data rendering |
| API guard | revert separately in API guard Gate |

Safe rollback default:

```text
Return to Auth-5 fail-closed page guard.
```

Rollback must not:

- run SQL.
- mutate Auth/DB.
- send reset/invite email.
- import benchmark data.
- call Meta API.
- trigger Python retrain.
- change env.

## 17. Recommended Decision

Recommended next Gate:

```text
Foresight-Auth-7 Agent Core session contract confirmation
```

Preferred direction:

```text
Use Agent Core shared session as the product auth source.
Keep Foresight fail-closed until that contract is explicit.
Use product-local Supabase Auth only as an approved fallback.
```

The authenticated path should not open until session verification and product access claims are deterministic and server-side.
