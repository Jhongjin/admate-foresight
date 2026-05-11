# Foresight Design Product QA Protected Analytical Surfaces v1

Date: 2026-05-11
Gate: Foresight-Design-Product-QA-Protected-Analytical-Surfaces
Status: checklist drafted
Repo: admate-foresight

## Purpose

Define the design and product QA checklist for protected Foresight analytical
surfaces after the current auth, Core handoff, protected navigation, empty
state, and KPI polish work.

This is a documentation-only QA planning gate. It does not approve production
handoff execution, SQL, database work, Meta API calls, Python retraining,
benchmark import or upload, code edits, asset edits, production browser
inspection, or environment/secret inspection.

## Baseline Assumptions

Recent closure/status artifacts establish the following baseline:

- protected pages fail closed to the Foresight login shell when no product
  session exists
- protected APIs fail closed with `401`
- logout clears the product-local session and protected navigation fails closed
  afterward
- approved positive Core-to-Foresight handoff reached a protected surface
- protected navigation has current desktop/mobile polish
- empty states have current polish across simulator, trends, insights, and
  competitor surfaces
- KPI benchmark state polish covers blocked, warning, low-confidence, and
  unavailable display concepts in the current local/synthetic scope

Evidence references:

- `docs/tasks/2026-05-11_foresight_status_next_gate_ui_auth_handoff_kpi_v1.md`
- `docs/tasks/2026-05-10_foresight_auth_closure_6_final_auth_handoff_closure_v1.md`
- `docs/tasks/2026-05-10_foresight_ux_4_mobile_navigation_closure_report_v1.md`
- `docs/tasks/2026-05-11_foresight_benchmark_qa_4_ui_state_mapping_plan_v1.md`
- `docs/tasks/2026-05-11_foresight_benchmark_qa_8_local_component_adapter_test_implementation_result_v1.md`

## Surface Inventory

Protected analytical surfaces:

- `/` simulator: campaign settings, prediction KPI cards, benchmark/trust
  details, range chart, comparison table, ML prediction panel, export affordance
- `/trends`: objective/metric filters, trend chart, latest comparison, gender
  and age breakdowns, competitor link-out affordance
- `/insights`: seasonality event filters, loading/empty season analysis, event
  comparison cards, metric change badges
- `/competitor`: keyword search, industry quick filters, ad cards, loading
  skeletons, empty/error states, Meta library outbound links

Protected account and auth-adjacent surfaces:

- `/account`: product-local access/session status
- access denied or no-product-access state: any future product access failure
  that differs from a missing session
- session expired/long-idle state: user returns after the session is invalid,
  expired, or cleared
- logout state: initiated from protected navigation and followed by protected
  route retry
- handoff failure state: invalid, expired, or disabled handoff copy shown on
  login

## Global QA Checklist

Run this checklist for each protected surface where applicable:

- [ ] Page title and supporting copy match the product task and do not expose
  implementation details, endpoint names, cookie names, handoff codes, session
  values, database names, or raw provider payloads.
- [ ] Top navigation remains visible and active route state is clear on desktop.
- [ ] Mobile navigation remains reachable without horizontal scroll, clipped
  labels, or desktop-only hover behavior.
- [ ] Primary content starts below the protected shell and is not hidden by
  sticky or fixed navigation.
- [ ] Loading, empty, blocked, low-confidence, unavailable, and error states are
  visually distinct.
- [ ] Any disabled action has adjacent copy that explains what is missing or
  blocked without implying a production data mutation.
- [ ] KPI and chart states avoid fabricating evidence when data is empty,
  unavailable, low confidence, or security-blocked.
- [ ] External links open safely, are visually identifiable, and do not leak
  sensitive query values.
- [ ] Copy can be understood by media planners and operators without relying on
  tooltips alone.
- [ ] Screen reader semantics are present for loading status, important blocked
  states, chart alternatives, form labels, disabled actions, and link purpose.
- [ ] Keyboard-only users can reach filters, menus, cards with actions, logout,
  and external links in a predictable order.
- [ ] Focus indicators are visible on interactive controls at desktop and
  mobile breakpoints.
- [ ] Long Korean labels, currency values, percentages, and date ranges wrap
  without overlapping adjacent content.
- [ ] No state displays secrets, tokens, cookies, session IDs, handoff codes,
  raw identifiers, service-role wording, private URLs, or row-level benchmark
  data.

## Simulator Checklist

Desktop:

- [ ] Campaign budget, duration, objective, industry, gender, and age controls
  are scannable and retain current selections after simulation updates.
- [ ] KPI cards preserve title, value, unit, industry average, diff badge, and
  benchmark trust details without crowding.
- [ ] Range chart and comparison table align on the selected budget.
- [ ] Export button is disabled or gated when no result exists, while loading,
  or when trust state blocks output.
- [ ] ML prediction panel makes model output visibly secondary to the main
  deterministic/product prediction and does not invite retraining in QA
  evidence.

Mobile:

- [ ] Controls stack in a usable order: budget, duration, objective, industry,
  gender, age, simulate.
- [ ] Multi-select controls, KPI cards, benchmark details, chart, table, and
  export affordance fit without horizontal overflow.
- [ ] The comparison table remains readable through responsive scrolling or
  condensed layout, with selected-row state still visible.

State checks:

- [ ] Empty pre-simulation state does not show stale metrics as evidence.
- [ ] Loading KPI state uses skeleton/status semantics and avoids layout jump.
- [ ] Low-confidence state shows the reason near the affected KPI and blocks
  report/export reliance until reviewed.
- [ ] Unavailable KPI state uses a clear placeholder and explains whether the
  issue is missing data, unsupported metric, or service unavailability.
- [ ] Blocked benchmark/security state prevents export, promotion, report-ready
  output, and LLM prompt use.
- [ ] Python retrain affordance, if visible, is treated as human-gated for QA
  and is not clicked in this checklist.

## Trends Checklist

Desktop:

- [ ] Objective and metric filters are clear, reset behavior is understandable,
  and selected state is visually strong enough.
- [ ] Top 3 ranking explains whether higher or lower is better for the selected
  metric.
- [ ] Monthly trend chart, latest comparison, gender distribution, and age
  distribution present the same metric label and unit consistently.
- [ ] Empty chart panels distinguish no matching data from a loading state.

Mobile:

- [ ] Filter rows wrap without pushing chart controls off screen.
- [ ] Chart legends, axis labels, and tooltips remain readable or have an
  acceptable mobile fallback.
- [ ] Competitor link-out section does not crowd the primary trend content.

State checks:

- [ ] Long-term trend-only data is labeled as trend reference, not current
  benchmark evidence.
- [ ] No-benchmark/no-data state avoids showing empty chart shells as proof.
- [ ] Low-confidence trend state keeps limitation copy close to the trend or
  table it affects.
- [ ] Unavailable API state gives recovery guidance without exposing endpoint,
  token, or database details.

## Insights Checklist

Desktop:

- [ ] Season event filter chips are readable, selected states are clear, and
  "all" behavior is obvious.
- [ ] Event cards make before/during/after windows easy to compare.
- [ ] Change badges communicate direction and whether higher/lower is favorable
  for each metric.
- [ ] Events with no during-period data are visibly limited and not treated as
  complete seasonal proof.

Mobile:

- [ ] Event cards stack cleanly with date ranges, metrics, badges, and charts
  still readable.
- [ ] Filter chip wrapping does not obscure page heading or first event card.
- [ ] Chart height and legend treatment avoid clipping on narrow screens.

State checks:

- [ ] Empty seasonality state recommends broadening filters without implying
  missing production setup.
- [ ] Low-confidence seasonal insight labels sample-size or coverage limits.
- [ ] Unavailable seasonal service state separates temporary service failure
  from "no seasonal evidence".
- [ ] Blocked/security state prevents report-ready seasonal recommendations.

## Competitor Checklist

Desktop:

- [ ] Keyword search, industry quick filters, loading skeletons, ad cards, and
  external Meta links have clear hierarchy.
- [ ] Empty results explain how to retry without blaming the user.
- [ ] Error state avoids revealing access token values, app secrets, provider
  responses, private URLs, or internal scraper details.
- [ ] Ad cards identify page name, body/title, date, CTA, and image fallback
  without relying on image-only context.

Mobile:

- [ ] Search input and button remain usable at narrow widths.
- [ ] Industry chips wrap without horizontal overflow.
- [ ] Ad cards maintain readable copy and tap targets.
- [ ] External Meta links are reachable and clearly outbound.

State checks:

- [ ] Meta API or scrape unavailable state is framed as data temporarily
  unavailable, not as a permission grant instruction for end users.
- [ ] Empty results do not show stale ad cards from a previous search.
- [ ] Blocked provider/security state prevents raw provider payload display.
- [ ] Any future low-confidence ad classification state is labeled as inferred,
  not verified competitor truth.

## Account, Access Denied, Session, And Logout Checklist

Account:

- [ ] `/account` confirms Foresight access in product language without showing
  cookie/session internals.
- [ ] Account page offers a clear path back to analysis surfaces and logout.
- [ ] Mobile account layout does not look like an error or dead end.

Access denied:

- [ ] Distinguish missing session, expired session, and authenticated-but-not-
  allowed product access.
- [ ] Access-denied copy tells the user who can grant access without naming
  service-role keys, DB tables, token claims, or internal permission fields.
- [ ] No analytical data, navigation-only previews, or stale KPI cards remain
  visible behind an access-denied state.

Session expired or long idle:

- [ ] Expired session routes back to login with copy that preserves the intended
  destination when safe.
- [ ] Long-idle recovery does not show stale protected content after session
  invalidation.
- [ ] Retry and return-to-login actions are keyboard reachable.

Logout:

- [ ] Logout is reachable from protected surfaces on desktop and mobile.
- [ ] Logout returns to the login shell and removes protected navigation/content.
- [ ] Attempting `/`, `/trends`, `/insights`, `/competitor`, or `/account` after
  logout fails closed to login.
- [ ] Logout copy does not imply Core account logout unless that behavior is
  separately approved.

Handoff failure:

- [ ] Invalid, expired, and disabled handoff states use distinct recovery copy.
- [ ] Handoff failure copy never displays the raw handoff code, code hash,
  signed URL, callback payload, cookie value, or session value.

## KPI Trust State Checklist

Apply to simulator KPI cards and any future KPI-bearing analytical surfaces:

- [ ] Ready state shows value, unit, basis, confidence, and recency without
  overstating production validation.
- [ ] Empty state says no usable evidence exists for the current selection and
  does not fabricate predictions.
- [ ] Low-confidence state states why confidence is low and blocks export or
  report-ready use until reviewed.
- [ ] Long-term-trend-only state separates older trend reference from current
  benchmark evidence.
- [ ] Validation-error state names the missing or invalid field in product-safe
  language and blocks storage, promotion, model use, and report-ready output.
- [ ] Security-review-required state uses blocked language and suppresses
  normalized preview, promotion, report export, and LLM prompt payload.
- [ ] Raw-identifier-risk state confirms aggregate-only use and excludes raw
  account, campaign, ad set, ad, advertiser, row-level, or private values.
- [ ] Unavailable state explains whether the data source, model service, or
  benchmark basis is unavailable without exposing endpoint or secret details.
- [ ] Blocked outputs are visible before the user can click a dependent action.
- [ ] Trust-state badges and notes remain readable at mobile widths and have
  accessible names when icon/color carries meaning.

## Copy Review Checklist

- [ ] Korean UI copy is short, action-oriented, and specific to the surface.
- [ ] Product copy distinguishes prediction, benchmark, trend reference,
  competitor evidence, and seasonal analysis.
- [ ] Empty states suggest safe next steps such as broadening filters or trying
  another keyword.
- [ ] Blocked states use "requires review" or equivalent reviewer-action
  language, not generic failure copy.
- [ ] Low-confidence states avoid "recommended", "guaranteed", "verified", or
  "production approved" unless separately approved.
- [ ] Unavailable states avoid exposing provider names when the user cannot act
  on them, except approved product-facing terms such as Meta library links.
- [ ] No copy directs end users to set secrets, inspect environment variables,
  run SQL, trigger retraining, upload benchmark files, or execute handoff
  manually.
- [ ] Developer/operator remediation copy, if retained, is clearly separated
  from end-user product copy and requires product approval before release.

## Accessibility Checklist

- [ ] Each page has one meaningful `h1`.
- [ ] Form fields have visible labels or equivalent accessible labels.
- [ ] Buttons and links have unique accessible names.
- [ ] Loading states use polite status semantics and do not trap focus.
- [ ] Empty and blocked states are announced as meaningful regions or status
  content when they replace primary content.
- [ ] Color is not the only signal for good/warning/blocked/low-confidence
  states.
- [ ] Chart information has enough nearby text, table, or summary context for
  non-visual review.
- [ ] Disabled controls either remain discoverable with explanation or have an
  adjacent visible reason.
- [ ] Keyboard focus order follows visual order across desktop and mobile.
- [ ] External links include purpose and destination context.

## Human-Gated Items

Require explicit human approval before execution or validation:

- production positive handoff, replay handoff, expired handoff, or secure
  handoff harness execution
- production browser/session inspection beyond operator-visible behavior
- SQL, DB read/write, schema migration, cleanup, revoke, or product access grant
- benchmark import, upload, DB promotion, raw file handling, or non-mock source
  processing
- Meta API calls, provider API calls, scrape execution against production, or
  raw provider payload inspection
- Python retraining, model execution beyond existing local typecheck/build
  safety, or benchmark model promotion
- environment, secret, token, cookie, session, credential, signed URL, browser
  storage, or private path inspection
- product image/media asset changes
- production deployment, production handoff, or production data mutation
- changing copy that instructs users to grant access, set credentials, or
  perform operational remediation

## Evidence Policy

Allowed evidence for future QA runs:

- sanitized screenshots
- viewport size
- route path
- selected filters and UI state labels
- pass/fail notes
- sanitized redirect target summary
- observed copy defects without secret values

Disallowed evidence:

- cookie, token, session, handoff code, code hash, credential, secret, signed
  URL, browser storage, or environment values
- raw provider payloads
- raw benchmark rows, raw campaign identifiers, raw account IDs, or private
  advertiser values
- SQL output, DB rows, service-role wording, or production mutation logs
- screenshots that expose private customer/campaign data unless separately
  approved and redacted

## Stop Conditions

Stop QA and open a separate gate if any check requires:

- production handoff execution
- SQL or DB mutation
- Meta/provider API execution
- Python retrain or model promotion
- benchmark import/upload or raw file handling
- reading secrets, cookies, session values, tokens, browser storage, or env
  values
- changing product code or assets
- exposing protected content without a valid product session
- approving a new permission, role, product-access matrix, or operational
  remediation path

## Verification Plan

For this docs-only checklist:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_design_product_qa_protected_analytical_surfaces_v1.md
npx tsc --noEmit
```

`npx tsc --noEmit` is allowed only as a local static check. Do not run build,
production handoff, SQL, Meta API, Python retrain, benchmark import/upload, or
production browser automation as part of this gate.

## Boundary Confirmation

This checklist creation does not perform:

- code or asset edits
- production handoff
- SQL execution
- DB/schema/migration changes
- benchmark import or upload
- Meta API calls
- Python retrain
- benchmark promotion
- production API calls
- environment, secret, token, cookie, session, credential, signed URL, or
  browser storage inspection
- commit, push, or PR creation

## Next Gate Recommendation

Next gate:

```text
Foresight-Design-Product-QA-Read-Only-Viewport-Pass
```

Run only after a human confirms the approved session, surfaces, viewport list,
evidence redaction policy, and no-touch boundaries for the QA pass.
