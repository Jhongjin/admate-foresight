# Foresight Benchmark QA 5 Component Route Test Approval Plan v1

Date: 2026-05-11
Gate: Foresight-Benchmark-QA-5
Status: approval target plan only
Repo: admate-foresight
Depends on:
- `7df7707 test: add Foresight benchmark UI state fixtures`
- `3bad0d9 docs: recap Foresight benchmark UI fixtures`
- `8ac4533 docs: plan Foresight benchmark UI state mapping`

## Purpose

Identify exact future component or route test targets for the committed
synthetic benchmark UI trust states before any test implementation begins.

This gate is documentation-only. It does not add a test runner, create tests,
edit UI, change benchmark fixtures, edit scripts or package files, run SQL,
touch databases, import or upload benchmark data, call Meta APIs, retrain
Python models, read environment secrets, or call production systems.

## Current Test Harness Context

Current local benchmark validation is script-based:

```text
npm run benchmark:ui-fixtures
npm run benchmark:dry-run
```

The repo currently has no committed component or route test runner script in
`package.json`. Therefore, future component or route tests must first approve
the test framework, exact file paths, and package script changes in a separate
implementation gate.

## Proposed Future Test Target Files

Preferred future target files, pending approval:

```text
tests/benchmark/benchmark-ui-state-fixtures.test.ts
tests/benchmark/benchmark-ui-state-rendering.test.tsx
tests/benchmark/benchmark-route-output-guards.test.ts
```

Target purpose:

| Proposed file | Purpose | Required approval before creation |
| --- | --- | --- |
| `tests/benchmark/benchmark-ui-state-fixtures.test.ts` | Assert the committed fixture builder covers all seven trust states and exposes safe test inputs. | Approve test runner and TypeScript test import setup. |
| `tests/benchmark/benchmark-ui-state-rendering.test.tsx` | Assert mapped UI components render status, basis, limitation, and blocked-state copy for every state. | Approve target component or adapter and rendering library. |
| `tests/benchmark/benchmark-route-output-guards.test.ts` | Assert any route-facing or report-preview adapter blocks unsafe outputs and does not expose raw identifiers. | Approve route or adapter module path and mock-only execution plan. |

Do not create these paths until QA-6 or a later implementation gate explicitly
approves them.

## Candidate UI Or Adapter Targets

Potential product targets to evaluate before implementation:

```text
components/KPICard.tsx
app/SimulatorPageClient.tsx
app/insights/InsightsPageClient.tsx
app/trends/TrendsPageClient.tsx
```

The safest future approach is to add a small local rendering adapter or
benchmark trust-state view model only if approved. The tests should not force
existing product pages to accept benchmark import, upload, DB, or production
data just to exercise fixture states.

## Fixture Import Strategy

Approved fixture source for future tests:

```ts
import {
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from "@/lib/benchmark/uiStateFixtures.mts";
```

Fallback import if the test runner cannot resolve aliases:

```ts
import {
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from "../../lib/benchmark/uiStateFixtures.mts";
```

Import rules:

- Use only `buildForesightBenchmarkUiStateFixtures()` and
  `validateForesightBenchmarkUiStateFixtures()` from the committed fixture
  module.
- Do not call import, upload, DB, Meta, Python, production, or authenticated
  browser paths.
- Do not read environment variables, secrets, cookies, sessions, or local
  private files.
- Do not create snapshot artifacts that include raw fixture payloads unless a
  future gate approves snapshot storage and redaction.

## State Assertions Required

Future tests should assert the seven trust states map to exactly one treatment:

| Trust state | Surface target | Required assertions |
| --- | --- | --- |
| `benchmark-ready` | KPI card or approved benchmark summary adapter | Metric, status, confidence, basis, recent window, and synthetic/local label are visible. |
| `low-confidence` | Forecast panel or approved forecast adapter | Low-confidence reason appears before export/report action; forecast copy does not overclaim. |
| `long-term-trend-only` | Trend table or approved trend adapter | Trend-only label appears; stale data is separated from current benchmark evidence. |
| `validation-error` | Upload mapping panel or approved validation adapter | Missing `spend` copy appears; storage, promotion, model use, and report-ready output are blocked. |
| `security-review-required` | Blocked promotion panel or approved safety adapter | Security-review copy appears; preview, promotion, export, and LLM payload are blocked. |
| `raw-identifier-risk` | Report preview or approved report adapter | Aggregate-only copy appears; raw account/campaign/ad identifiers do not render. |
| `no-benchmark-data` | Empty benchmark table or approved empty-state adapter | No usable benchmark copy appears; forecast fabrication and evidence-like empty shells are blocked. |

## Copy Expectations

Future component or route tests should look for stable, user-facing concepts
rather than exact full paragraphs where possible.

Required copy concepts:

- benchmark basis visible with metric
- low-confidence reason visible before export or report use
- long-term trend separated from current benchmark evidence
- missing required field remediation
- security review required before promotion
- raw identifiers excluded from report-ready output
- no usable aggregate benchmark for empty selection

Disallowed copy concepts:

- production validation claims for synthetic fixtures
- "safe to promote" when promotion is blocked
- "current benchmark" for trend-only data
- forecast values fabricated from empty scopes
- raw identifier labels, URL-like values, token-like values, cookies, sessions,
  or private file/path strings

## Blocked Outputs

Future tests must prove these outputs remain blocked unless a later gate
explicitly approves them:

- benchmark import
- benchmark upload
- DB promotion or storage writes
- report export when confidence, validation, or security state blocks it
- normalized preview for security-review fixtures
- model use or LLM prompt payload
- raw identifier display
- forecast fabrication from empty benchmark data
- empty source shells styled as evidence

## Safe Validation Commands

Commands safe for this approval-plan gate:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_benchmark_qa_5_component_route_test_approval_plan_v1.md
npm run benchmark:ui-fixtures
```

Candidate commands for a future implementation gate after exact paths and test
runner are approved:

```text
npm run benchmark:ui-fixtures
npm run benchmark:dry-run
npm run lint
npx tsc --noEmit
npm run build
```

Do not add or run new component/route test commands until the test runner and
file paths are approved.

## Explicit Boundaries

This plan does not approve:

- code, UI, script, package, lockfile, or TypeScript config edits
- creating test files
- adding test dependencies or package scripts
- SQL execution
- DB read/write, schema changes, migrations, imports, uploads, or storage work
- Meta API calls or scraping
- Python retrain or model execution
- environment, secret, token, cookie, credential, or session reads/writes
- production calls or authenticated production browser checks
- outputting raw provider, advertiser, account, campaign, ad set, ad, or row
  data
- commit or push

## Next Gate Suggestions

Recommended next gates:

1. `Foresight-Benchmark-QA-6-Test-Runner-And-Path-Approval`
   - Approve the test framework, dependency impact, package script, and exact
     target files before implementation.

2. `Foresight-Benchmark-QA-7-Local-Component-Test-Implementation`
   - Add only approved local component/adapter tests using synthetic fixtures.

3. `Foresight-Benchmark-QA-8-Route-Guard-Test-Implementation`
   - Add route-facing output guard tests only if an approved route or adapter
     target exists and can run without production, DB, env, or API access.

4. `Foresight-Benchmark-Import-Approval`
   - Separate gate for any real benchmark ingestion or DB promotion, including
     provenance, privacy handling, operator approval, target tables, rollback,
     and explicit non-mock execution approval.
