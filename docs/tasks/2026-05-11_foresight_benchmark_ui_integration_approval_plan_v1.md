# Foresight Benchmark UI Integration Approval Plan v1

Date: 2026-05-11
Gate: Foresight-Benchmark-UI-Integration-Approval
Status: approval plan only
Repo: admate-foresight
Depends on:
- `d658274 test: cover Foresight benchmark UI states`
- `78c24f7 test: add Foresight benchmark UI runner`
- `d86fe5b docs: approve Foresight benchmark test runner plan`
- `219a6f4 docs: plan Foresight benchmark UI test approval`
- `8ac4533 docs: plan Foresight benchmark UI state mapping`
- `7df7707 test: add Foresight benchmark UI state fixtures`

## Purpose

Decide what must be approved before product UI components consume the local
benchmark adapters:

```text
lib/benchmark/uiStateViewModel.ts
lib/benchmark/routeOutputGuards.ts
```

This plan does not approve actual UI integration. It is documentation-only and
does not edit product code, tests, package files, configs, routes, data flows,
or runtime behavior.

## Current Approved Local Context

The QA-8 implementation added pure synthetic adapters and tests only:

```text
lib/benchmark/uiStateViewModel.ts
lib/benchmark/routeOutputGuards.ts
tests/benchmark/benchmark-ui-state-fixtures.test.ts
tests/benchmark/benchmark-ui-state-rendering.test.tsx
tests/benchmark/benchmark-route-output-guards.test.ts
```

The adapters are local-only and currently consume committed synthetic fixture
types. They keep report readiness and promotion readiness blocked. They do not
perform benchmark import, upload, DB promotion, Meta calls, Python retraining,
environment reads, production calls, browser authentication, or product-data
execution.

## Integration Decision

Actual product UI integration is not approved in this gate.

Before any product component consumes `uiStateViewModel.ts` or
`routeOutputGuards.ts`, a later implementation gate must approve:

- exact component path or route path
- exact data source and whether it is synthetic-only, mock-only, or real
- exact state ownership and prop contract
- exact redaction and blocked-output behavior
- exact user-facing copy concepts
- exact validation commands
- rollback plan
- explicit no-touch boundaries for DB, import, upload, Meta, Python, env,
  production, and browser-auth paths

## Exact Candidate Component Paths

Candidate UI component paths to evaluate in a later implementation gate:

```text
components/KPICard.tsx
app/SimulatorPageClient.tsx
app/insights/InsightsPageClient.tsx
app/trends/TrendsPageClient.tsx
app/competitor/CompetitorPageClient.tsx
```

Candidate route-facing paths to evaluate only if a pure local adapter boundary
is approved:

```text
app/api/export/route.ts
app/api/insights/route.ts
app/api/trends/route.ts
app/api/predict/route.ts
app/api/predict-range/route.ts
```

Route integration should remain blocked unless the next gate can prove the
route path runs without DB reads or writes, import or upload execution, Meta
API calls, Python model execution, environment or secret reads, production
calls, browser authentication, or product data.

## Preferred Integration Shape

Preferred future shape, pending separate approval:

1. Keep `lib/benchmark/uiStateViewModel.ts` as the product-facing display
   adapter for benchmark trust-state copy.
2. Keep `lib/benchmark/routeOutputGuards.ts` as the route/report-facing safety
   adapter for blocked output and redaction concepts.
3. Pass a prebuilt local view model into a narrow presentational component.
4. Do not let product pages call fixture builders directly.
5. Do not let API routes emit raw fixture payloads or raw source rows.
6. Keep all real benchmark ingestion, storage, and promotion out of UI
   integration unless a separate import approval gate explicitly allows it.

## Required Before Product UI Consumption

A later implementation gate must provide:

- component-level contract showing which props come from benchmark adapters
- state mapping for all seven trust states
- visible blocked-output and limitation treatment per state
- redaction guarantees for account, campaign, ad set, ad, advertiser, URL-like,
  token-like, cookie, session, private path, and row-level values
- explicit copy expectations for synthetic/local context if using fixtures
- accessibility expectations for status, limitation, and blocked-state copy
- test plan for the exact component path
- route safety plan if route-facing output is involved
- validation plan including local tests, lint, typecheck, build, and diff check
- rollback plan that can remove UI consumption without changing data flows

## Required State Coverage

Any future product UI integration must cover these seven states:

```text
benchmark-ready
low-confidence
long-term-trend-only
validation-error
security-review-required
raw-identifier-risk
no-benchmark-data
```

Required concepts:

- `benchmark-ready`: metric, status, confidence, basis, recent window, and
  synthetic/local or approved-source context are visible
- `low-confidence`: limitation appears before export or report use
- `long-term-trend-only`: stale trend reference is not styled as current
  benchmark evidence
- `validation-error`: missing `spend` remediation appears and storage,
  promotion, model use, and report-ready output remain blocked
- `security-review-required`: security-review copy appears and normalized
  preview, promotion, export, and LLM payload remain blocked
- `raw-identifier-risk`: aggregate-only copy appears and raw identifiers do
  not render
- `no-benchmark-data`: no usable aggregate benchmark copy appears and forecast
  fabrication remains blocked

## Risks To Resolve Before Implementation

- Product page imports may trigger broad runtime dependencies or data fetching.
- API route imports may touch DB clients, env variables, Meta clients, Python
  paths, or production-oriented behavior.
- UI copy could imply benchmark promotion, report readiness, or production
  validation when only synthetic fixtures are available.
- Route/report output could leak raw identifiers, credential-like strings,
  URLs, private paths, or row-level payloads if adapter boundaries are bypassed.
- Empty benchmark states could be mistaken for valid evidence shells.
- Trend-only data could be presented as current benchmark evidence.
- Low-confidence output could be exported or reused without limitation copy.
- Existing product components may require design or state refactors outside the
  approved benchmark adapter scope.

## No-Touch Boundaries

This plan does not approve:

- editing product UI components
- editing API routes
- editing benchmark adapters
- editing tests
- editing package or lock files
- creating config files
- SQL execution
- DB read or write
- schema changes or migrations
- benchmark import, upload, storage, or promotion
- Meta API calls or scraping
- Python retraining or model execution
- environment, secret, token, cookie, credential, session, or private file reads
- production calls
- authenticated browser checks
- raw provider, advertiser, account, campaign, ad set, ad, row-level, URL-like,
  token-like, cookie, session, or private path output
- commit or push

## Candidate Validation Plan For A Later Implementation Gate

If a later gate approves product UI integration, run:

```text
npm run benchmark:ui-fixtures
npm run test:benchmark-ui
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

Add focused component or adapter tests only for the approved path. Do not add
browser-auth checks, production calls, DB checks, import/upload execution, Meta
API calls, Python retraining, or env/secret reads unless a separate gate
explicitly approves them.

## Safe Validation For This Plan

Safe commands for this docs-only approval plan:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_benchmark_ui_integration_approval_plan_v1.md
npm run test:benchmark-ui
```

## Next Gate Suggestions

Recommended next gates:

1. `Foresight-Benchmark-UI-Integration-Target-Selection`
   - Select exactly one product component path and define its adapter contract.
2. `Foresight-Benchmark-UI-Integration-Implementation`
   - Implement only the selected component integration with synthetic or
     explicitly approved local data.
3. `Foresight-Benchmark-QA-9-Route-Guard-Test-Implementation`
   - Extend route-facing guard tests only if a pure route/report adapter path
     remains local-only and side-effect-free.
4. `Foresight-Benchmark-Import-Approval`
   - Separate future gate for real benchmark ingestion or DB promotion,
     including source provenance, privacy handling, operator approval, target
     tables, rollback, and explicit non-mock execution approval.
