# Foresight Design QA 2 Auth Shell And Account Access States Plan v1

Date: 2026-05-11
Gate: Foresight-Design-QA-2
Status: docs-only implementation plan
Repo: admate-foresight

## Purpose

Plan the design and UX implementation for Foresight auth-adjacent surfaces
identified by the Design QA 1 read-only audit:

- quieter public login and reset-password shell behavior
- distinct access denied, expired, invalid, and disabled handoff states
- account page return-to-analysis CTA, product role, and access display
- mobile, responsive, and accessibility acceptance criteria

This gate is documentation only. It does not implement UI changes, run browser
login, inspect production sessions, call Meta APIs, run SQL, run Python
retraining, import/upload benchmark data, inspect secrets, or change product
configuration.

## Source Context

Primary predecessor:

- `docs/tasks/2026-05-11_foresight_design_qa_1_readonly_ui_design_readiness_audit_v1.md`

Related planning and closure context:

- `docs/tasks/2026-05-11_foresight_design_product_qa_protected_analytical_surfaces_v1.md`
- `docs/tasks/2026-05-10_foresight_auth_closure_6_final_auth_handoff_closure_v1.md`
- `docs/tasks/2026-05-10_foresight_ux_4_mobile_navigation_closure_report_v1.md`
- `docs/tasks/2026-05-11_foresight_status_next_gate_ui_auth_handoff_kpi_v1.md`

QA 1 established that protected route and API guards are directionally sound,
but auth-adjacent UX is not ready to close because public pages still inherit
the product navigation shell and `/account` is still a minimal session status
page.

## Design Decision: Public Auth Shell

Preferred decision:

- Use an auth-only shell for `/login` and `/reset-password`.
- Hide protected analytical navigation links on public auth routes.
- Keep only product identity, login/reset content, support/access-request
  affordance, and legally/product-approved footer links if needed.
- Preserve the sanitized `next` destination behavior, but convert displayed
  route text into product-language return copy.

Implementation shape to plan:

- Introduce a route-aware shell boundary or layout split so public auth pages do
  not render protected nav links.
- Keep protected navigation unchanged for `/`, `/trends`, `/insights`,
  `/competitor`, and `/account`.
- Ensure the auth shell cannot expose stale authenticated navigation after
  logout.
- Keep Core handoff CTA as the primary action when configured.
- Keep reset-password and access-request actions visually secondary.

Decision alternatives if the team does not approve an auth-only shell:

- Retain global navigation but render protected links as disabled on public
  routes, with tooltip or adjacent copy saying Foresight login is required.
- Retain links but replace protected destinations with `/login?next=...`,
  making the route behavior explicit. This is less quiet and should be treated
  as a deliberate product decision, not the default.
- Retain current shell only as a temporary state with a visible follow-up ticket
  and QA evidence showing protected links fail closed.

Acceptance criteria for the preferred decision:

- `/login` and `/reset-password` do not display protected links to simulator,
  trends, insights, competitor, or account.
- Public pages still identify the product as AdMate Foresight.
- Public pages have one clear primary action.
- Logout recovery lands on the quiet login shell.
- Direct navigation to protected routes without a valid session still redirects
  to login with a sanitized return target.
- No cookie, session, handoff code, code hash, token, env value, or internal
  permission field is displayed.

## State Model

The implementation should separate these user states:

- Missing session: user has no current Foresight product session.
- Expired session: user previously had a session, but it is no longer valid.
- Invalid handoff: the handoff link or callback payload cannot be accepted.
- Expired handoff: the handoff existed but is outside its allowed window.
- Disabled handoff: Core-to-Foresight connection is not available.
- Access denied: user is authenticated through the expected path but is not
  allowed to use Foresight.
- Active access: user has a valid Foresight session and can return to analysis.

The UX should avoid collapsing access denied into expired or invalid login
states. Expired/invalid states are recovery problems; access denied is an
authorization or entitlement problem.

## Access And Handoff Copy Plan

Use product-safe copy that names the user action, not the internal mechanism.
Final Korean wording should be reviewed in the implementation gate.

Missing session:

- Title concept: "Foresight login required"
- Body concept: "Continue with your AdMate account to open this Foresight
  workspace."
- Primary action: "Continue with AdMate"
- Secondary action: "Request access"

Expired session:

- Title concept: "Session expired"
- Body concept: "For security, your Foresight session ended. Log in again to
  return to the requested analysis screen."
- Primary action: "Log in again"
- Secondary action: "Go to login"

Invalid handoff:

- Title concept: "Login link could not be verified"
- Body concept: "The Foresight login request is no longer valid. Start again
  from AdMate or ask your workspace admin for a new link."
- Primary action: "Start again from AdMate"
- Secondary action: "Request access"

Expired handoff:

- Title concept: "Login link expired"
- Body concept: "This Foresight login link has expired. Return to AdMate and
  open Foresight again."
- Primary action: "Return to AdMate"
- Secondary action: "Request a new link"

Disabled handoff:

- Title concept: "Foresight connection unavailable"
- Body concept: "Foresight access is not ready for this workspace yet. Contact
  your AdMate workspace owner or support."
- Primary action: "Request access"
- Secondary action: "Back to login"

Access denied:

- Title concept: "Foresight access not enabled"
- Body concept: "Your AdMate account is signed in, but Foresight has not been
  enabled for this workspace or role."
- Primary action: "Request Foresight access"
- Secondary action: "Return to AdMate"

Copy boundaries:

- Do not mention cookies, session IDs, JWTs, code hashes, DB tables, service
  roles, route guards, callback payloads, environment variables, or token
  claims.
- Do not tell end users to edit secrets, run SQL, inspect Vercel, trigger
  retraining, upload benchmarks, or call provider APIs.
- Keep operator remediation out of end-user copy unless product explicitly
  approves an operator-only variant.

## Account Page Plan

The `/account` page should become a small access hub, not just an active-session
confirmation.

Recommended content hierarchy:

- Page title: Foresight account and access.
- Status summary: active, expired, denied, or unavailable state in plain
  product language.
- Product access: Foresight enabled or not enabled.
- Role/access label: workspace owner, analyst, viewer, or unknown/unassigned if
  the current system cannot safely determine a role.
- Workspace/account label: product-safe display name only if already available
  without exposing private identifiers.
- Expiry or renewal detail: show friendly session/access timing only if the
  source already supports it without exposing raw session data.
- Primary CTA: return to analysis.
- Secondary actions: open trends, open insights, open competitor, log out, or
  request access depending on state.

Return-to-analysis behavior:

- If the user arrived with a safe `next` target, the primary CTA returns there.
- If no safe target exists, the primary CTA returns to `/`.
- If the user lacks access, the primary CTA changes to request access or return
  to AdMate; protected analytical CTAs are hidden or disabled.

Product role/access display rules:

- Display only stable product concepts that users can understand.
- Prefer "Foresight enabled", "Foresight not enabled", "Role pending", or
  "Role not available" over internal permission names.
- If role data is not currently available, show a deliberate neutral state
  rather than inventing role detail.
- Do not expose raw account IDs, user IDs, workspace IDs, email verification
  internals, cookie names, token claims, access table names, or service-role
  wording.

Account page acceptance criteria:

- Account page has one meaningful `h1`.
- Active users see a clear return-to-analysis CTA above secondary links.
- Account state does not read as an error when access is active.
- Denied users see support/request-access guidance instead of protected data.
- Mobile layout stacks status, access detail, CTA, and secondary actions without
  horizontal scroll.
- Logout remains reachable and does not imply Core account logout unless that
  behavior is separately approved.

## Route And Surface Acceptance Criteria

`/login`:

- Uses the public auth shell decision selected above.
- Shows distinct copy for missing session, expired session, invalid handoff,
  expired handoff, disabled handoff, and access denied where applicable.
- Preserves sanitized return target behavior without displaying raw technical
  routes as the primary user message.
- Hides protected nav links under the preferred decision.

`/reset-password`:

- Uses the same quiet public shell as login.
- Does not expose protected analytical nav links under the preferred decision.
- Provides a clear path back to login without implying protected access.

`/account`:

- Shows active access state and product role/access display.
- Provides return-to-analysis as the primary action for active access.
- Provides request-access or return-to-AdMate guidance for denied access.
- Does not expose protected data, session internals, or permission internals.

Protected analytical routes:

- No new implementation is planned in this gate.
- Protected pages continue to fail closed through existing guards.
- Any account/access CTA that appears on protected pages must route through the
  safe account/access state model above.

## Mobile And Responsive Acceptance Criteria

Breakpoints to verify in a later implementation QA pass:

- 320 px narrow mobile
- 390 px common mobile
- 768 px tablet
- 1024 px small desktop
- 1440 px desktop

Public auth shell:

- Product identity, state title, body copy, CTA, and secondary actions fit
  without clipped text.
- No horizontal scroll appears from long Korean labels or return-destination
  copy.
- Primary and secondary actions have at least touch-friendly sizing and spacing.
- Reset/login links do not wrap into ambiguous or overlapping rows.

Account page:

- Status summary appears before detail rows on mobile.
- Primary return-to-analysis CTA remains visible without requiring users to
  parse the whole page.
- Detail rows wrap values cleanly and do not create two-column crowding at
  narrow widths.
- Secondary actions stack or wrap predictably.

Navigation:

- Public auth routes do not show protected mobile nav under the preferred
  decision.
- Protected routes keep the existing mobile menu behavior.
- After logout, mobile users see the quiet public shell, not stale protected
  navigation.

## Accessibility Acceptance Criteria

Semantic structure:

- Each public/auth/account state has one meaningful `h1`.
- State messages are associated with the main region or a named status/alert
  region depending on severity.
- Loading or disabled handoff state uses polite status semantics if dynamic.

Keyboard and focus:

- Primary action, secondary actions, reset/login links, request-access link, and
  logout are keyboard reachable.
- Focus order follows visual order on desktop and mobile.
- Focus indicators are visible against the auth shell and account page
  backgrounds.
- Disabled actions either remain discoverable with explanatory text or are
  removed when unavailable.

Copy and perception:

- Color is not the only indicator for denied, expired, invalid, disabled, or
  active states.
- Links and buttons have unique accessible names.
- Error-like states do not trap focus.
- Return-to-analysis CTA has a descriptive accessible name, especially when it
  returns to a sanitized `next` target.

Privacy:

- Screen-reader text must follow the same no-secret/no-internals policy as
  visible text.
- Hidden labels must not include raw tokens, session identifiers, callback
  payloads, or internal permission names.

## Implementation Sequence For A Future Code Gate

Recommended order:

1. Confirm the public auth shell decision with product/design.
2. Add or adjust route-shell boundaries for `/login` and `/reset-password`.
3. Define a small state-to-copy map for login/access/handoff outcomes.
4. Extend `/account` content with access status, role/access display, and
   return-to-analysis CTA.
5. Add or adjust tests for route shell visibility, state copy, and account CTA
   behavior where existing test patterns allow.
6. Run local static checks approved for that future implementation gate.
7. Run sanitized viewport/a11y QA only after explicit human approval and an
   approved non-secret evidence policy.

This gate does not authorize those code steps.

## Evidence Policy For Future QA

Allowed:

- sanitized screenshots
- viewport size
- route path
- selected state name, such as expired, denied, or active
- pass/fail observations
- sanitized return-target summary

Disallowed:

- cookies, session values, handoff codes, code hashes, tokens, secrets,
  credentials, signed URLs, browser storage, or environment values
- raw provider payloads
- SQL output, DB rows, internal access table names, or service-role wording
- raw benchmark rows, campaign IDs, account IDs, ad IDs, advertiser values, or
  private customer data

## Stop Conditions

Stop and open a separate gate if implementation or QA requires:

- browser login or production positive handoff execution
- production session inspection
- SQL, DB reads/writes, schema changes, cleanup, revoke, or access grants
- Meta API calls, provider API calls, scraping, or raw provider payload review
- Python retraining or model promotion
- benchmark import, upload, promotion, or raw file handling
- environment, secret, token, cookie, credential, signed URL, session, browser
  storage, or private path inspection
- product code changes beyond a separately approved implementation gate
- committing, pushing, or opening a PR

## Verification Plan

For this docs-only gate:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_design_qa_2_auth_shell_account_access_states_plan_v1.md
```

`npx tsc --noEmit` and `npm run benchmark:dry-run` are not necessary for this
documentation-only plan, though they remain allowable local checks only if a
future gate explicitly asks for them.

## No-Touch Confirmation

This plan is intended to change only this documentation artifact under
`docs/tasks`.

It does not change source code, assets, configuration, packages, lockfiles,
environment files, SQL, Python, benchmark data, Meta/provider integrations,
production behavior, secrets, sessions, credentials, or deployment state.
