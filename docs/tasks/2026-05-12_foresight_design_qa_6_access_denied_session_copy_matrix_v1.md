# Foresight Design QA 6 Access Denied Session Copy Matrix v1

Date: 2026-05-12
Gate: Foresight-Design-QA-6
Status: docs-only copy matrix and state coverage plan
Repo: admate-foresight

## Purpose

Define the product-safe copy matrix and state coverage plan for Foresight access
denied, session expired, and disabled entitlement states.

This artifact is documentation only. It does not require or authorize login,
Core handoff execution, authenticated browser reuse, production access, SQL,
DB/Auth mutation, product entitlement changes, environment or secret
inspection, benchmark import/upload, Meta/provider API calls, Python retrain,
deployment, product code changes, or asset changes.

## Source Context

Predecessor gate:

- `docs/tasks/2026-05-12_foresight_design_qa_5_auth_shell_account_no_session_queue_v1.md`

Related design and status context:

- `docs/tasks/2026-05-11_foresight_design_qa_1_readonly_ui_design_readiness_audit_v1.md`
- `docs/tasks/2026-05-11_foresight_design_qa_2_auth_shell_account_access_states_plan_v1.md`
- `docs/tasks/2026-05-11_foresight_design_qa_4_auth_shell_account_post_deploy_safe_smoke_plan_v1.md`
- `docs/tasks/2026-05-11_foresight_design_product_qa_protected_analytical_surfaces_v1.md`
- `docs/tasks/2026-05-11_foresight_status_next_gate_ui_auth_handoff_kpi_v1.md`

Local source files reviewed for copy alignment:

- `app/login/page.tsx`
- `app/account/page.tsx`
- `components/Navigation.tsx`
- `lib/auth/foresightAuth.ts`
- `lib/auth/foresightPageGuard.ts`

Current commit context:

- `d4a6106 docs: record Foresight auth shell no-session queue`

## Current Coverage Baseline

Covered in current source and prior result docs:

- Public `/login` and `/reset-password` use a quiet auth shell without protected
  analytical navigation.
- Missing or invalid product-local session on `/`, `/trends`, `/insights`,
  `/competitor`, and `/account` redirects to `/login?next=...`.
- `next` return targets are restricted to approved Foresight routes and have
  sensitive query keys removed.
- Login copy currently distinguishes missing/default login, `handoff=expired`,
  `handoff=invalid`, and `handoff=disabled`.
- `/account` currently represents active access only after a valid product-local
  session guard passes.

Not yet covered as an implemented or verified product state:

- authenticated-but-not-entitled access denied
- workspace entitlement disabled
- role denied or role pending
- session expired as a first-class copy state distinct from expired handoff
- active session later revoked while the user is on a protected route
- account page denied-state rendering

This gate defines copy and coverage expectations for those future states, but
does not claim that they are implemented.

## Copy Principles

All end-user copy should:

- name the user-facing state and next safe action
- avoid internal auth, database, provider, route-guard, and entitlement
  implementation details
- preserve the user's safe intended Foresight destination when available
- avoid implying that the user can self-grant access
- distinguish recovery problems from authorization problems
- keep operator remediation out of end-user UI

Disallowed end-user wording:

- cookie, session ID, JWT, token, handoff code, code hash, signed URL, claim,
  service role, row level security, database table, environment variable,
  provider credential, Vercel, Supabase, Meta token, Python retrain, benchmark
  upload, or SQL instruction language

## State Copy Matrix

| State | User situation | Surface | Title copy | Body copy | Primary action | Secondary action | Current coverage |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Missing session | User opens Foresight without a product-local session. | `/login` after protected redirect | AdMate Foresight 로그인 | 성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요. | AdMate 계정으로 계속 | 이용 신청 | Implemented as default login shell. |
| Session expired | User had access, but the product-local session is no longer valid or was cleared. | `/login` | 세션이 만료되었습니다 | 보안을 위해 Foresight 접속이 종료되었습니다. 다시 로그인하면 요청한 분석 화면으로 돌아갑니다. | 다시 로그인 | 이용 신청 | Planned; current source only has expired handoff copy. |
| Invalid session | Session cannot be accepted after retry or stale browser state. | `/login` | 다시 로그인이 필요합니다 | 현재 Foresight 접속 상태를 확인할 수 없습니다. AdMate 계정으로 다시 로그인해 주세요. | 다시 로그인 | 로그인 화면으로 이동 | Planned. |
| Expired handoff | Core handoff was valid before, but its allowed window has passed. | `/login?handoff=expired` | 로그인 확인이 만료되었습니다 | 보안을 위해 로그인 확인 시간이 지났습니다. AdMate에서 Foresight를 다시 열어 주세요. | AdMate 계정으로 계속 | 이용 신청 | Partially implemented with shorter copy. |
| Invalid handoff | Handoff request cannot be verified. | `/login?handoff=invalid` | 로그인 연결을 확인할 수 없습니다 | Foresight 로그인 요청을 완료할 수 없습니다. AdMate에서 다시 시작하거나 접근 권한을 문의해 주세요. | AdMate 계정으로 계속 | 이용 신청 | Partially implemented with shorter copy. |
| Handoff disabled | Core-to-Foresight handoff is not currently available. | `/login?handoff=disabled` or unconfigured CTA | 로그인 연결이 준비되지 않았습니다 | 현재 이 작업 공간에서는 Foresight 로그인 연결을 사용할 수 없습니다. 접근이 필요하면 관리자에게 문의해 주세요. | 이용 신청 | 로그인 화면으로 이동 | Partially implemented with shorter copy and disabled CTA. |
| Access denied | User is authenticated, but cannot use Foresight for this workspace or role. | `/account` or future denied state route | Foresight 접근 권한이 없습니다 | AdMate 계정은 확인되었지만 이 작업 공간 또는 역할에는 Foresight 접근이 활성화되어 있지 않습니다. | Foresight 접근 문의 | AdMate로 돌아가기 | Planned only. |
| Entitlement disabled | Product entitlement exists in the platform but is disabled for the workspace. | `/account` or future denied state route | Foresight 사용이 비활성화되어 있습니다 | 이 작업 공간의 Foresight 사용이 현재 비활성화되어 있습니다. 다시 사용하려면 작업 공간 관리자에게 문의해 주세요. | 접근 상태 문의 | AdMate로 돌아가기 | Planned only. |
| Role pending | User belongs to a workspace, but no usable Foresight role is assigned yet. | `/account` | 역할 확인이 필요합니다 | Foresight를 사용할 역할이 아직 지정되지 않았습니다. 작업 공간 관리자에게 역할 설정을 요청해 주세요. | 역할 설정 문의 | AdMate로 돌아가기 | Planned only. |
| Workspace unavailable | Workspace display or access context cannot be safely shown. | `/account` | 작업 공간을 확인할 수 없습니다 | 현재 표시 가능한 작업 공간 정보를 확인할 수 없습니다. 다시 로그인하거나 접근 상태를 문의해 주세요. | 다시 로그인 | 접근 문의 | Planned only. |
| Logout complete | User signs out from Foresight and returns to public login. | `/login` | AdMate Foresight 로그인 | 로그아웃되었습니다. 다시 이용하려면 AdMate 계정으로 로그인하세요. | AdMate 계정으로 계속 | 이용 신청 | Planned copy refinement; logout redirect exists. |
| Active access | User has a valid Foresight product-local session. | `/account` | 계정 및 접근 상태 | 현재 Foresight 접근이 활성화되어 있습니다. 분석 화면으로 돌아가거나 필요한 보조 화면을 열 수 있습니다. | 성과 예측으로 돌아가기 | 접근 문의 | Implemented for active guarded account page. |

## Surface Placement Plan

`/login` should own recovery states:

- missing session
- session expired
- invalid session
- expired handoff
- invalid handoff
- handoff disabled
- logout complete

`/account` should own access state and entitlement states after a valid,
approved session context exists:

- active access
- access denied
- entitlement disabled
- role pending
- workspace unavailable

Protected analytical routes should not render their own entitlement details
unless a future product gate explicitly approves inline denied states. The
safer default is:

- missing or expired session redirects to `/login` with a sanitized `next`
  target
- authenticated access-denied state routes to `/account` or a dedicated
  product-safe access state
- no simulator, trends, insights, competitor, KPI, chart, benchmark, or
  provider data remains visible behind a denied or expired state

## State Coverage Plan

Coverage should be tracked separately for route behavior, visible copy,
privacy, accessibility, and responsive layout.

| State | Route behavior | Copy check | Privacy check | A11y check | Responsive check | Gate type |
| --- | --- | --- | --- | --- | --- | --- |
| Missing session | Protected routes redirect to `/login?next=...`. | Login default copy and safe destination text. | No protected content, session, token, or internal path detail. | One `h1`; primary CTA reachable. | 320, 390, 768, 1024, 1440 px. | No-session local or post-deploy smoke. |
| Session expired | Expired session lands on login and preserves safe `next`. | Expired-session copy, not handoff copy. | No stale protected content or session internals. | Status copy announced near main login region. | Same viewport set. | Future implementation QA; no session inspection. |
| Invalid session | Invalid local session lands on login. | Retry login copy avoids blaming user. | No cookie or session parsing output. | Focus starts at main recovery action. | Same viewport set. | Future implementation QA; synthetic or approved safe harness. |
| Handoff expired | Login shows expired handoff state. | Return-to-AdMate or retry wording. | No handoff code, code hash, or callback payload. | Error text has non-color signal. | Same viewport set. | Human-gated secure handoff harness only. |
| Handoff invalid | Login shows invalid handoff state. | Start-again and request-access wording. | No raw callback fields. | Error text has non-color signal. | Same viewport set. | Human-gated secure handoff harness only. |
| Handoff disabled | Login shows disabled/unconfigured state. | Access request wording, not operator setup instructions. | No env var names or deployment detail. | Disabled CTA has adjacent explanation. | Same viewport set. | Docs or local static QA unless live config is tested. |
| Access denied | Route reaches account/access state without protected data. | Distinct from missing or expired session. | No role claim, account ID, workspace ID, table, or policy detail. | Denied region is named and actionable. | Same viewport set. | Human-gated entitlement QA. |
| Entitlement disabled | Route reaches disabled-product state. | Workspace-level disabled copy. | No grant/revoke internals. | Primary support/request action reachable. | Same viewport set. | Human-gated entitlement QA. |
| Role pending | Route reaches pending-role state. | Role setup request copy. | No internal role slug or permission claim. | State not color-only. | Same viewport set. | Human-gated entitlement QA. |
| Active access | `/account` renders active hub. | Active copy does not sound like an error. | No session/cookie values. | Return CTA first in focus order after summary. | Same viewport set. | Approved authenticated QA only. |

## Recommended Future Implementation Shape

This docs gate does not authorize product code edits, but the safest future
implementation pattern is:

1. Define a small state-to-copy map with explicit keys such as `missing`,
   `session_expired`, `session_invalid`, `handoff_expired`, `handoff_invalid`,
   `handoff_disabled`, `access_denied`, `entitlement_disabled`,
   `role_pending`, `workspace_unavailable`, `logout_complete`, and `active`.
2. Keep login recovery states separate from account entitlement states.
3. Keep all raw auth/session/handoff details out of the copy map.
4. Add route or component tests using synthetic state inputs only.
5. Add viewport QA only after the route state can be generated without exposing
   real accounts, sessions, cookies, tokens, or workspace identifiers.
6. Treat access-denied and entitlement-disabled verification as human-gated
   because it may require approved product-access fixtures or operator-owned
   test accounts.

## Acceptance Criteria For Future Code Gate

Future implementation can close this matrix only when:

- missing session, session expired, handoff expired, handoff invalid, handoff
  disabled, access denied, entitlement disabled, role pending, workspace
  unavailable, logout complete, and active access have explicit copy ownership
- `/login` does not expose protected analytical navigation
- `/account` does not expose protected analytical data in denied states
- protected analytical routes fail closed before content render when no valid
  session exists
- access denied is not shown as "invalid login"
- entitlement disabled is not shown as "session expired"
- all primary and secondary actions have product-safe destinations
- Korean labels fit at 320 px without clipping, overlap, or horizontal scroll
- no visible, hidden, aria, test, or log copy includes secrets, tokens,
  cookies, handoff codes, session IDs, raw IDs, env values, DB table names, or
  provider credential wording

## Evidence Policy

Allowed evidence for this gate and future safe QA:

- route path
- state key
- sanitized redirect path/query shape
- visible title and body copy
- primary and secondary action labels
- viewport size
- pass/fail notes
- static diff and secret scan results

Disallowed evidence:

- cookies, session values, tokens, handoff codes, code hashes, signed URLs,
  credentials, secrets, env values, browser storage, private paths, or decoded
  auth payloads
- raw provider responses
- raw benchmark rows, campaign IDs, account IDs, user IDs, workspace IDs, ad
  IDs, advertiser names, or private customer data
- SQL output, DB rows, service-role wording, entitlement table names, grant or
  revoke logs
- screenshots containing authenticated account, workspace, campaign, provider,
  session, token, or storage data

## Stop Conditions

Stop and open a separate approved gate if any verification requires:

- login or positive Core handoff
- production handoff, replay handoff, expired handoff, or secure handoff
  harness execution
- authenticated browser/session/cookie/storage inspection
- SQL, DB read/write, schema migration, cleanup, revoke, or access grant
- product entitlement mutation or role assignment
- Meta/provider API execution
- Python retraining
- benchmark import/upload or raw file handling
- environment, secret, token, credential, signed URL, or private path
  inspection
- production deployment or production data mutation

## Verification Plan

For this docs-only artifact:

```text
git diff --check -- docs/tasks/2026-05-12_foresight_design_qa_6_access_denied_session_copy_matrix_v1.md
git diff -- docs/tasks/2026-05-12_foresight_design_qa_6_access_denied_session_copy_matrix_v1.md
git status --short
```

Secret-oriented review should inspect only the new documentation diff for
credential-shaped strings and disallowed evidence. `npx tsc --noEmit` is
optional and not required because this gate does not modify source code.

## Boundary Confirmation

This artifact is intended to change only this documentation file under
`docs/tasks`.

It does not change source code, assets, configuration, packages, lockfiles,
environment files, SQL, Python, benchmark data, Meta/provider integrations,
production behavior, secrets, sessions, credentials, entitlements, roles, or
deployment state.
