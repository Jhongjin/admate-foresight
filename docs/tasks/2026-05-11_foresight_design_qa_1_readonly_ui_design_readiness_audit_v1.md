# Foresight Design QA 1 Readonly UI Design Readiness Audit v1

Date: 2026-05-11
Gate: Foresight-Design-QA-1
Status: read-only audit complete
Repo: admate-foresight

## Purpose

Audit the current Foresight UI/design readiness for protected analytical
surfaces after the auth, Core handoff, protected navigation, empty-state, and
KPI trust-state work.

This is a source and documentation review only. It does not implement UI
changes, approve production handoff execution, run browser login, call Meta
APIs, execute SQL, run Python retraining, import or upload benchmarks, inspect
secrets, or mutate product data.

## Reviewed Sources

Primary UI and route sources reviewed:

- `app/layout.tsx`
- `components/Navigation.tsx`
- `components/StatePanel.tsx`
- `components/KPICard.tsx`
- `components/MultiSelectDropdown.tsx`
- `app/login/page.tsx`
- `app/page.tsx`
- `app/SimulatorPageClient.tsx`
- `app/trends/page.tsx`
- `app/trends/TrendsPageClient.tsx`
- `app/insights/page.tsx`
- `app/insights/InsightsPageClient.tsx`
- `app/competitor/page.tsx`
- `app/competitor/CompetitorPageClient.tsx`
- `app/account/page.tsx`
- `lib/auth/foresightPageGuard.ts`
- `lib/auth/foresightApiGuard.ts`
- `lib/auth/foresightAuth.ts`
- `lib/auth/foresightSession.ts`
- `lib/benchmark/uiStateViewModel.ts`

Recent context artifacts reviewed:

- `docs/tasks/2026-05-10_foresight_auth_closure_6_final_auth_handoff_closure_v1.md`
- `docs/tasks/2026-05-10_foresight_ux_4_mobile_navigation_closure_report_v1.md`
- `docs/tasks/2026-05-11_foresight_status_next_gate_ui_auth_handoff_kpi_v1.md`
- `docs/tasks/2026-05-11_foresight_benchmark_qa_8_local_component_adapter_test_implementation_result_v1.md`
- `docs/tasks/2026-05-11_foresight_benchmark_kpi_trust_state_copy_review_checklist_v1.md`
- `docs/tasks/2026-05-11_foresight_design_product_qa_protected_analytical_surfaces_v1.md`

## Executive Verdict

Foresight is directionally ready for a protected analytical surface design QA
pass, but not ready to close design readiness for all protected product states.

Current strengths:

- Protected page guards are present for `/`, `/trends`, `/insights`,
  `/competitor`, and `/account`.
- Core handoff, invalid/expired/disabled handoff copy, and product-local
  session behavior are represented in the login/handoff path.
- Protected navigation has desktop active state, mobile menu behavior, and
  logout access on protected surfaces.
- Shared empty/loading panels now give the major analytical surfaces a more
  consistent no-data baseline.
- KPI card component supports benchmark trust detail props and accessible
  labels for benchmark status, confidence, basis, notes, and blocked outputs.

Readiness blockers or design gaps:

- Login still inherits the global product navigation shell, so public login can
  expose links to protected analytical routes. This is fail-closed at the route
  level, but design should decide whether the login shell should be quieter.
- `/account` is still a minimal session status page and does not yet handle
  access-denied, product-role, expiry, or return-to-analysis patterns beyond
  the global nav.
- Simulator UI still exposes a model retrain affordance after ML state appears.
  The route has internal-key and execution gates, but the design surface needs
  human-gated wording or removal before product QA closure.
- Competitor error copy currently gives operator remediation including Vercel
  and `META_ACCESS_TOKEN`. That is not appropriate end-user copy for a
  protected analytical surface.
- KPI trust-state infrastructure exists in component props and local synthetic
  adapters, but the live simulator KPI cards observed in source still pass only
  market average/diff props. Product route integration for the trust-state view
  model remains a follow-up gate.
- Mobile/responsive behavior is plausibly improved but not closed by this
  source-only review. Charts, dense chip rows, seasonality cards, and long
  Korean labels still need viewport evidence.

## Protected Surface Behavior

`/`, `/trends`, `/insights`, `/competitor`, and `/account` call
`requireForesightPageSession` before rendering page content. Missing or invalid
product sessions redirect to `/login?next=...` through sanitized next-path
handling.

Observed design state:

- Positive: protected analytical content is not rendered by the server page
  without a valid product session.
- Positive: allowed next paths are restricted to product routes and sensitive
  query keys are removed before redirect construction.
- Positive: protected data APIs used by the analytical pages generally call
  `requireForesightApiSession`.
- Gap: the login shell still renders the global Foresight nav through
  `app/layout.tsx`. Clicking nav links while unauthenticated should fail
  closed, but the public shell still visually advertises protected surfaces.
- Gap: access-denied as distinct from missing/expired session is not yet a
  visible product state. Handoff payload parsing can reject unauthorized access,
  but the user-facing route lands in generic invalid/expired login states.

## Navigation Readiness

Current navigation is usable for the MVP:

- desktop nav has visible product links and active route state
- mobile nav uses a `메뉴` / `닫기` toggle with `aria-controls` and
  `aria-expanded`
- logout is hidden on `/login` and `/reset-password`
- logout is available from protected desktop and mobile nav

Open design risks:

- Public login and reset surfaces still show product navigation links. This is
  a product-shell decision point rather than an auth blocker.
- Navigation labels are long. Source uses flex and mobile menu treatment, but
  a viewport pass is still needed for 320-390 px widths, Korean font loading,
  and sticky header interaction with first content.
- The global nav provides the only return path from `/account`; account page
  itself has no local return/action affordance.

## Surface Audit

### `/login`

Ready:

- Presents a clear Foresight login card with Core handoff CTA when configured.
- Disabled state exists when handoff configuration is incomplete.
- Distinct expired, invalid, and disabled handoff messages are present.
- Sanitized `next` path is displayed as "login after destination" context.
- Reset-password and access-request affordances exist.

Gaps:

- Global product nav remains visible on the public login shell.
- The displayed `next` path is product-safe by sanitizer, but still feels
  technical and should be product-reviewed for end-user copy.
- Disabled handoff copy says connection is not ready but does not distinguish
  operator setup from user access timing.

Design gate recommendation:

- Decide whether login should use a separate auth-only shell without protected
  nav links.
- Review handoff failure copy for user action, support routing, and product
  owner language.

### `/` Simulator

Ready:

- Protected by server page guard.
- Main workflow has one clear `h1`, campaign settings, simulation CTA,
  condition tags, KPI cards, ML panel, optimization guide, range chart, and
  comparison table.
- Pre-simulation state avoids showing result panels until simulation starts.
- Budget comparison table uses horizontal overflow handling.
- Range chart has loading and empty `StatePanel` treatments.
- Export button is disabled before result, while loading, and while exporting.

Gaps:

- KPI cards in the live simulator source are not visibly wired to the benchmark
  trust-state view model; they pass market average and diff props but not the
  new benchmark status/confidence/basis/blocked-output props.
- The ML model retrain button is visible from the product UI after ML state
  appears. Even with server-side internal-key and dry-run/execute protections,
  this should be human-gated or hidden for protected analytical QA.
- Export copy remains visible even though `/api/export` is disabled. The button
  enables when local result exists and would then fail at runtime.
- Several spinner/loading states are local visual spinners rather than the
  shared `StatePanel`, so accessibility and copy consistency vary.
- Scenario and optimization copy can overstate guidance without an explicit
  confidence/trust state nearby.

Design gate recommendation:

- Add a simulator-specific trust-state integration gate before closing KPI
  readiness.
- Decide whether retrain and export affordances should be removed, disabled
  with reviewer-safe copy, or moved to an operator-only surface.

### `/trends`

Ready:

- Protected by server page guard.
- Global filters for objective and metric are clear.
- Metric ranking explains whether higher or lower is better.
- Monthly trend, latest comparison, gender distribution, and age distribution
  share metric labels and formatter logic.
- Empty/loading panels exist for the main trend chart and empty breakdowns.
- Competitor link-out is product-relevant.

Gaps:

- Only the monthly trend fetch owns a top-level loading state. Breakdown
  sections can appear empty while their fetches are still in flight.
- Chart accessibility is mostly visual; there is no source-visible non-chart
  table fallback or textual chart summary for screen reader review.
- Dense filters and chart legends need mobile viewport evidence.
- Long-term-trend-only versus current benchmark trust language is not
  represented on the live trends page.

Design gate recommendation:

- Add per-section loading/empty distinction for rankings and breakdowns.
- Add a read-only viewport and accessibility evidence pass for chart-heavy
  states.

### `/insights`

Ready:

- Protected by server page guard.
- Season insight flow has clear page purpose and event comparison structure.
- Loading and empty states use `StatePanel`.
- Event cards label before, during, and after windows.
- Events with no during-period data receive a visible badge.

Gaps:

- Seasonality cards use a fixed three-column period grid inside each card;
  mobile narrow-width behavior needs evidence.
- Change badges rely heavily on color and arrow symbols. Favorability is
  encoded in metric-specific inverse logic but not explained accessibly.
- Low-confidence/sample-size language is limited to row count display and does
  not yet block report-ready interpretation.
- Only industry filters are present; no all-events/no-events copy beyond the
  shared empty panel.

Design gate recommendation:

- Run viewport QA for event cards at narrow widths.
- Add seasonal confidence/coverage copy before seasonal recommendations are
  considered report-ready.

### `/competitor`

Ready:

- Protected by server page guard.
- Search, industry chips, loading skeletons, ad cards, empty state, and
  outbound Meta links are present.
- Loading search clears prior ads, reducing stale-card risk.
- Outbound ad links use `target="_blank"` with `rel="noopener noreferrer"`.

Gaps:

- Page auto-loads competitor ads on protected entry, which would call the
  protected API in an authenticated browser session. This audit did not execute
  it; design QA should decide whether auto-load is acceptable.
- Error copy includes operator details: Vercel dashboard and
  `META_ACCESS_TOKEN`. This should not ship as end-user product copy.
- Card images have empty alt text. That may be acceptable for decorative
  images, but ad creative is likely meaningful content and needs an accessible
  alternative policy.
- Empty/error/unavailable provider states are not yet separated into no result,
  provider unavailable, permission/configuration, and security-blocked states.
- Industry chip list is long and needs mobile overflow evidence.

Design gate recommendation:

- Replace operator remediation copy with product-safe unavailable state copy.
- Decide whether first-load competitor fetch should require explicit user
  action for QA and provider-cost control.

### `/account`

Ready:

- Protected by server page guard.
- Confirms active Foresight access session without exposing cookie/session
  internals.

Gaps:

- Minimal page only confirms active session.
- No local return-to-analysis CTA, role/product-access details, expiry state,
  access-denied distinction, or support path.
- Mobile layout is simple and likely safe, but it may read as a dead-end state.

Design gate recommendation:

- Treat account/access-denied/session-expired as a separate design gate before
  broader protected-surface closure.

## Empty And No-Data State Readiness

Ready:

- Shared `StatePanel` now covers loading and empty states with role/status
  semantics.
- Simulator, trends, insights, and competitor all use improved no-data states
  in at least one primary area.

Gaps:

- `StatePanel` only supports `loading` and `empty`; blocked, unavailable,
  low-confidence, security-review, and validation-error states remain local or
  absent on live pages.
- Some local loading states are simple spinners without `role="status"` or
  consistent copy.
- Empty states generally suggest broadening filters, but provider unavailable
  and security-blocked cases need separate copy.

## KPI Trust-State Readiness

Ready:

- `KPICard` has props and accessible sections for benchmark status,
  confidence, synthetic context, basis lines, visible copy, and blocked outputs.
- Local synthetic benchmark view model keeps report and promotion readiness
  blocked.
- Prior docs record local synthetic fixture/test coverage.

Gaps:

- Live simulator KPI cards do not appear to consume the trust-state view model
  or pass benchmark detail props in the reviewed source.
- Trust states are currently stronger in component/test infrastructure than in
  route-level product composition.
- Report/export blocking is not yet visibly tied to trust-state outcomes in
  the simulator UI.

Design gate recommendation:

- Next KPI gate should verify live route composition, not only component-level
  capability.

## Mobile And Responsive Risk

Source-level positives:

- Global layout uses constrained width and responsive padding.
- Navigation has a dedicated mobile menu.
- KPI grid, ad grid, seasonality grid, and trend cards use responsive columns.
- Simulator comparison table uses horizontal overflow.
- Chips generally use flex wrapping.

Source-level risks needing visual evidence:

- Login card plus global nav at 320-390 px.
- Simulator long budget values, KPI diff badges, condition tags, and export
  header row.
- Trends chart legends, axis labels, and dense objective/metric chips.
- Insights three-column period cards inside event cards.
- Competitor long industry chip list, search input/button row, ad-card CTA
  labels, and external-link row.
- Account page dead-end perception on mobile.

This audit did not run browser login or authenticated viewport checks.

## Copy Consistency

Ready:

- Korean page titles and supporting copy are generally concise and product
  oriented.
- Login failure states avoid showing raw handoff code or session values.
- Protected analytical pages mostly use planner-friendly labels.

Gaps:

- Product naming is mixed between AdMate Foresight, older AdPlanner export file
  naming, ML/Python terminology, and operator/provider language.
- Competitor error copy exposes environment-variable and Vercel operator
  remediation.
- Simulator ML and retrain copy is implementation-oriented.
- Trends and insights need clearer distinction between trend reference,
  benchmark evidence, prediction, and seasonal analysis.
- Export availability copy conflicts with the disabled export route.

## Accessibility Readiness

Ready:

- Each reviewed page has a visible `h1`.
- Navigation has an aria label, mobile menu expanded state, and active-page
  semantics.
- Shared `StatePanel` uses `role="status"` for loading and a named region for
  empty states.
- KPI trust detail sections include accessible labels when used.

Gaps:

- Some icon-only or emoji-heavy meaning is not fully backed by accessible text.
- Chart-heavy sections lack source-visible table/text alternatives.
- Multi-select dropdown behavior relies on custom button/list mechanics and
  needs keyboard/focus verification.
- Competitor ad creative image alt policy is unresolved.
- Color plus arrow semantics in insights need non-color explanation.

## Next Design Gates

Recommended next gates:

1. `Foresight-Design-QA-2-Auth-Shell-And-Access-States`
   - Decide login shell nav behavior.
   - Define access denied, expired session, and account/profile states.

2. `Foresight-Design-QA-3-Live-KPI-Trust-State-Integration`
   - Verify live simulator KPI route composition consumes benchmark trust
     state props.
   - Tie export/report affordances to blocked and low-confidence states.

3. `Foresight-Design-QA-4-Operator-Affordance-Copy-Cleanup`
   - Review retrain, export, Meta/provider unavailable, and env-remediation
     copy.

4. `Foresight-Design-QA-5-Read-Only-Viewport-And-A11y-Pass`
   - Use approved sanitized non-production or operator-visible evidence only.
   - Cover desktop and 320/390/768 px mobile/tablet widths.

## Human-Gated Or Forbidden During This Audit

Not run and not approved:

- production handoff or browser login
- SQL or database reads/writes
- benchmark import, upload, promotion, or raw file handling
- Meta API/provider calls or authenticated scraping
- Python retraining or model promotion
- production API calls
- environment, secret, token, cookie, credential, session, signed URL, browser
  storage, or private file inspection
- source, env, config, package, or asset edits
- commit, push, or PR creation

## Validation Results

Validation commands run for this artifact:

```text
PASS git diff --check -- docs/tasks/2026-05-11_foresight_design_qa_1_readonly_ui_design_readiness_audit_v1.md
PASS npx tsc --noEmit
PASS npm run build
PASS npm run benchmark:dry-run
```

`npm run build` completed with Next.js 16.2.1 and generated the expected app
route summary.

`npm run benchmark:dry-run` reported:

```text
mode=local_inline_mock_only
db_write=false
meta_api_call=false
llm_call=false
python_retrain=false
raw_file_created=false
expectation_failures=[]
```

## No-Touch Confirmation

This audit changed only this documentation artifact under `docs/tasks`.

No code, environment, config, package, lockfile, source asset, SQL, Python,
benchmark data, Meta/provider integration, or production behavior was modified.
