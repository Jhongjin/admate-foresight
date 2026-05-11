# Foresight Benchmark UI Integration Target Selection Plan v1

Date: 2026-05-11
Gate: Foresight-Benchmark-UI-Integration-Target-Selection
Status: target selection plan only
Repo: admate-foresight
Depends on:
- `docs/tasks/2026-05-11_foresight_benchmark_ui_integration_approval_plan_v1.md`
- `d658274 test: cover Foresight benchmark UI states`
- `78c24f7 test: add Foresight benchmark UI runner`

## Purpose

Select exactly one low-risk product UI target for a future benchmark trust-state
integration gate.

This plan does not approve actual UI integration. It is documentation-only and
does not edit product code, tests, package files, configs, routes, data flows,
or runtime behavior.

## Selected Future Target

Selected target:

```text
components/KPICard.tsx
```

Approved adapter dependency candidates for a later implementation gate:

```text
lib/benchmark/uiStateViewModel.ts
lib/benchmark/routeOutputGuards.ts
```

The preferred future direction is for `KPICard` to receive prebuilt benchmark
display props or an already sanitized view-model fragment. `KPICard` should
not call fixture builders, dry-run harnesses, route handlers, database clients,
Meta clients, Python endpoints, import/upload code, environment variables, or
production systems.

## Why This Target

`components/KPICard.tsx` is the lowest-risk product component candidate because:

- it is already a narrow presentational component
- it displays metric labels, values, comparison labels, loading state, and
  status-like visual treatment
- it does not own API calls, route execution, export behavior, DB access,
  Python retraining, authenticated browser state, or product-data loading
- it is used by `app/SimulatorPageClient.tsx`, where benchmark comparison
  concepts already appear as market-label display props
- it can be integrated by adding optional display props without changing
  benchmark import, upload, storage, or promotion flows

Higher-risk candidates are deferred:

```text
app/SimulatorPageClient.tsx
app/insights/InsightsPageClient.tsx
app/trends/TrendsPageClient.tsx
app/competitor/CompetitorPageClient.tsx
app/api/export/route.ts
app/api/insights/route.ts
app/api/trends/route.ts
app/api/predict/route.ts
app/api/predict-range/route.ts
```

Those paths may involve page state, fetch calls, product data, export behavior,
route behavior, Python calls, or broader runtime dependencies, so they require
separate approval before use.

## Exact Allowed Files For A Later Implementation Gate

A future implementation gate may propose edits only to:

```text
components/KPICard.tsx
tests/benchmark/benchmark-ui-state-rendering.test.tsx
```

Optional only if the existing adapter contract is insufficient:

```text
lib/benchmark/uiStateViewModel.ts
```

Do not edit route handlers, product pages, package files, lockfiles, configs,
fixture builders, dry-run harnesses, database code, import/upload code, Meta
API code, Python code, or export code under this target selection.

## Candidate Future Contract

Candidate optional `KPICard` prop shape for a later gate:

```text
benchmarkStatusLabel
benchmarkBasisLabel
benchmarkConfidenceLabel
benchmarkLimitationLabel
benchmarkSyntheticContextLabel
benchmarkBlockedOutputs
```

Any final prop names must be approved in the implementation gate. The props
should accept already sanitized strings or arrays from
`lib/benchmark/uiStateViewModel.ts`. They must not accept raw fixture payloads,
raw rows, provider identifiers, account identifiers, campaign identifiers,
ad set identifiers, ad identifiers, advertiser values, URL-like values,
token-like values, cookies, sessions, private paths, or row-level payloads.

## Required Future State Coverage

Any future `KPICard` integration test must cover all seven benchmark trust
states:

```text
benchmark-ready
low-confidence
long-term-trend-only
validation-error
security-review-required
raw-identifier-risk
no-benchmark-data
```

Required visible concepts:

- benchmark basis with metric
- confidence or limitation state
- synthetic/local or explicitly approved source context
- blocked outputs where applicable
- no promotion-ready or report-ready claim for blocked states
- no raw identifier, URL-like, token-like, cookie, session, private path, or
  row-level output

## Risks To Resolve Before Implementation

- Adding benchmark copy directly to `KPICard` could clutter a compact metric
  card or make existing simulator cards too dense.
- Optional props must not change current KPI behavior when omitted.
- The component must not imply production validation, benchmark import, DB
  promotion, report readiness, or export readiness.
- The view model must remain the only source of benchmark trust-state copy.
- Future tests must not import `app/SimulatorPageClient.tsx` if doing so
  triggers fetch behavior, export code, Python calls, or other page-level side
  effects.
- Raw fixture payloads must not be spread into React markup.

## Rollback Plan For A Later Implementation Gate

Rollback should be simple and local:

1. Remove the optional benchmark props and rendering branch from
   `components/KPICard.tsx`.
2. Remove or update only the focused benchmark rendering tests that exercised
   the `KPICard` prop contract.
3. Keep `lib/benchmark/uiStateViewModel.ts` and
   `lib/benchmark/routeOutputGuards.ts` intact unless the implementation gate
   specifically changed them.
4. Re-run the same local validation commands.

Rollback must not require DB changes, import cleanup, upload cleanup, Meta
cleanup, Python retrain rollback, environment changes, production changes, or
browser-auth cleanup.

## No-Touch Boundaries

This target-selection plan does not approve:

- editing `components/KPICard.tsx`
- editing product pages
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

If a later gate approves the `KPICard` integration, run:

```text
npm run benchmark:ui-fixtures
npm run test:benchmark-ui
npm run lint
npx tsc --noEmit
npm run build
git diff --check
```

The implementation should add or update focused Vitest/jsdom coverage in
`tests/benchmark/benchmark-ui-state-rendering.test.tsx` only. Browser-auth
checks, production calls, DB checks, import/upload execution, Meta API calls,
Python retraining, and env/secret reads remain out of scope.

## Safe Validation For This Plan

Safe commands for this docs-only target-selection plan:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_benchmark_ui_integration_target_selection_plan_v1.md
npm run test:benchmark-ui
```

## Next Gate Suggestions

Recommended next gates:

1. `Foresight-Benchmark-KPICard-Integration-Implementation`
   - Add only the approved optional `KPICard` benchmark display contract and
     focused Vitest/jsdom coverage.
2. `Foresight-Benchmark-QA-9-Route-Guard-Test-Implementation`
   - Extend route-facing guard tests only if a pure route/report adapter path
     remains local-only and side-effect-free.
3. `Foresight-Benchmark-Import-Approval`
   - Separate future gate for real benchmark ingestion or DB promotion,
     including source provenance, privacy handling, operator approval, target
     tables, rollback, and explicit non-mock execution approval.
