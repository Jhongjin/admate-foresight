# Foresight Benchmark QA 6 Test Runner And Path Approval Plan v1

Date: 2026-05-11
Gate: Foresight-Benchmark-QA-6
Status: approval target plan only
Repo: admate-foresight
Depends on:
- `7df7707 test: add Foresight benchmark UI state fixtures`
- `3bad0d9 docs: recap Foresight benchmark UI fixtures`
- `8ac4533 docs: plan Foresight benchmark UI state mapping`
- `docs/tasks/2026-05-11_foresight_benchmark_qa_5_component_route_test_approval_plan_v1.md`

## Purpose

Approve the exact future local test runner, package/script footprint, and test
file paths for benchmark UI trust-state coverage before any implementation
begins.

This gate is documentation-only. It does not add dependencies, edit
`package.json`, edit lockfiles, create test files, create config files, edit
source or scripts, run SQL, touch databases, import or upload benchmark data,
call Meta APIs, retrain Python models, read environment secrets, or call
production systems.

## Current Harness Context

Committed benchmark validation remains script-based:

```text
npm run benchmark:ui-fixtures
npm run benchmark:dry-run
```

Current `package.json` has no committed component or route test script. The
repo has `playwright` and `playwright-core` dependencies, but does not have
`vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, or
`@testing-library/user-event` installed.

## Exact Candidate Test Runner

Preferred future local runner, pending approval:

```text
Vitest with jsdom
```

Candidate package footprint for a later implementation gate:

```text
devDependencies:
- vitest
- jsdom
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
```

Candidate package script for a later implementation gate:

```json
{
  "scripts": {
    "test:benchmark-ui": "vitest run tests/benchmark --environment jsdom"
  }
}
```

Runner rationale:

- exercises React components and local adapters without starting a Next dev
  server
- keeps tests mock-only and synthetic-fixture-only
- avoids production, DB, upload, import, Meta API, environment, and
  authenticated browser paths
- supports route-facing guard tests through pure adapters before any browser or
  server route test is considered

Do not add this runner, install packages, edit scripts, or create config files
until a later implementation gate explicitly approves those edits.

## Exact Future File Paths

Approved candidate paths for a later implementation gate:

```text
tests/benchmark/benchmark-ui-state-fixtures.test.ts
tests/benchmark/benchmark-ui-state-rendering.test.tsx
tests/benchmark/benchmark-route-output-guards.test.ts
```

Candidate support path, only if needed and separately approved:

```text
tests/benchmark/setup.ts
```

Candidate config path, only if the package script alone is not enough:

```text
vitest.config.ts
```

Do not create any of these files in this approval-plan gate.

## Candidate Test Responsibilities

| Future file | Runner | Responsibility |
| --- | --- | --- |
| `tests/benchmark/benchmark-ui-state-fixtures.test.ts` | Vitest node-compatible test | Assert the fixture builder exposes all seven trust states and validation succeeds for committed synthetic fixtures. |
| `tests/benchmark/benchmark-ui-state-rendering.test.tsx` | Vitest jsdom with Testing Library | Assert approved component or adapter rendering shows benchmark basis, limitations, blocked-state copy, and synthetic/local context. |
| `tests/benchmark/benchmark-route-output-guards.test.ts` | Vitest pure unit test | Assert route-facing adapter output blocks unsafe states and never exposes raw identifiers, secrets, production paths, or row-level payloads. |

These tests should import only committed local fixture helpers:

```ts
import {
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from "@/lib/benchmark/uiStateFixtures.mts";
```

Fallback import if aliases are not approved for the runner:

```ts
import {
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from "../../lib/benchmark/uiStateFixtures.mts";
```

## Exact Candidate Product Or Adapter Targets

Candidate product files to evaluate before implementation:

```text
components/KPICard.tsx
app/SimulatorPageClient.tsx
app/insights/InsightsPageClient.tsx
app/trends/TrendsPageClient.tsx
```

Preferred lower-risk adapter paths, if direct page tests would force broad
imports or side effects:

```text
lib/benchmark/uiStateViewModel.ts
lib/benchmark/routeOutputGuards.ts
```

These adapter paths are candidates only. Creating them would require a later
implementation gate because this QA-6 gate is docs-only.

## Required State Coverage

Future tests must cover exactly these seven trust states:

```text
benchmark-ready
low-confidence
long-term-trend-only
validation-error
security-review-required
raw-identifier-risk
no-benchmark-data
```

Required assertions by state:

| Trust state | Required future assertions |
| --- | --- |
| `benchmark-ready` | Metric, status, confidence, basis, recent window, and synthetic/local label are visible; import and DB promotion remain unapproved. |
| `low-confidence` | Confidence limitation appears before export or report use; forecast copy does not overclaim. |
| `long-term-trend-only` | Trend-only label appears; stale trend reference is not styled as current benchmark evidence. |
| `validation-error` | Missing `spend` remediation appears; storage, promotion, model use, and report-ready output remain blocked. |
| `security-review-required` | Security-review copy appears; normalized preview, promotion, export, and LLM payload remain blocked. |
| `raw-identifier-risk` | Aggregate-only copy appears; raw account, campaign, ad set, ad, advertiser, URL-like, token-like, and row-level values do not render. |
| `no-benchmark-data` | No usable aggregate benchmark copy appears; forecast fabrication and empty evidence shells remain blocked. |

## Validation Commands

Safe validation commands for this docs-only gate:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_benchmark_qa_6_test_runner_and_path_approval_plan_v1.md
npm run benchmark:ui-fixtures
```

Candidate validation commands for a later implementation gate after runner and
paths are approved:

```text
npm run benchmark:ui-fixtures
npm run test:benchmark-ui
npm run lint
npx tsc --noEmit
npm run build
```

Do not run `npm run test:benchmark-ui` until the script exists and its package
footprint is explicitly approved.

## No-Touch Boundaries

This plan does not approve:

- code, UI, script, package, lockfile, TypeScript config, or test config edits
- creating `tests/benchmark/*`
- creating `vitest.config.ts`
- installing, removing, or updating dependencies
- SQL execution
- DB read/write, schema changes, migrations, imports, uploads, storage writes,
  or promotion work
- Meta API calls, scraping, or browser automation against authenticated or
  production surfaces
- Python retrain, model execution, or benchmark ingestion
- environment, secret, token, cookie, credential, session, or private file
  reads/writes
- production calls or authenticated production browser checks
- raw provider, advertiser, account, campaign, ad set, ad, row-level, URL-like,
  token-like, or private path output
- commit or push

## Next Gate Suggestions

Recommended next gates:

1. `Foresight-Benchmark-QA-7-Local-Test-Runner-Setup`
   - Add only the approved Vitest jsdom dependency/script/config footprint.
   - Re-run fixture validation and lint/type/build checks approved for that
     gate.

2. `Foresight-Benchmark-QA-8-Local-Component-Test-Implementation`
   - Create only approved `tests/benchmark/*` component or adapter tests using
     synthetic fixtures.
   - Keep production, DB, import, upload, Meta API, env, and retraining work out
     of scope.

3. `Foresight-Benchmark-QA-9-Route-Guard-Test-Implementation`
   - Add route-facing output guard tests only if a pure adapter path exists and
     can run without production, DB, env, API, browser auth, or imports.

4. `Foresight-Benchmark-Import-Approval`
   - Separate future gate for real benchmark ingestion or DB promotion,
     including source provenance, operator approval, privacy handling, target
     tables, rollback, and explicit non-mock execution approval.
