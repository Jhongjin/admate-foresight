# Foresight Benchmark QA 4 UI State Mapping Plan v1

Date: 2026-05-11
Gate: Foresight-Benchmark-QA-4
Status: plan only
Repo: admate-foresight
Depends on:
- `7df7707 test: add Foresight benchmark UI state fixtures`
- `3bad0d9 docs: recap Foresight benchmark UI fixtures`

## Purpose

Plan how the committed synthetic benchmark UI trust states should map into
future Foresight UI surfaces. This gate is documentation-only. It does not
implement UI, change fixture code, edit scripts or package files, call APIs,
read or write databases, import benchmark data, upload files, retrain Python
models, access secrets, or touch production systems.

## Source Fixture Contract

The committed fixture pack defines seven synthetic local trust states:

- `benchmark-ready`
- `low-confidence`
- `long-term-trend-only`
- `validation-error`
- `security-review-required`
- `raw-identifier-risk`
- `no-benchmark-data`

Each fixture includes:

- `state`
- `source_case`
- `status_label`
- `primary_surface`
- optional metric labels
- benchmark basis labels
- visible copy expectations
- reviewer action labels
- redaction expectations
- blocked outputs

Future UI work should consume these concepts as test fixtures or mapping
requirements only. The fixture shape should not force production data model,
database, upload, import, or Meta API changes.

## State-To-Surface Mapping

| Trust state | Primary surface | UI intent | Required display concepts |
| --- | --- | --- | --- |
| `benchmark-ready` | `kpi_card` | Show a reviewed synthetic aggregate benchmark as ready for approval. | Metric label, value label, confidence label, basis label, recent window, currency/net basis, synthetic fixture label. |
| `low-confidence` | `forecast_panel` | Keep forecast or benchmark suggestion visibly limited before export or report use. | Low-confidence status, reason near the metric, sample or coverage warning, reviewer action before export. |
| `long-term-trend-only` | `trend_table` | Separate older trend reference data from current default benchmark evidence. | Trend-only status, older date window, recent-data exclusion, stale/current separation copy. |
| `validation-error` | `upload_mapping_panel` | Block benchmark promotion when required metadata is missing. | Missing field copy, remediation prompt, rejected or blocked status, canonical field names only. |
| `security-review-required` | `blocked_promotion_panel` | Stop promotion, preview, export, and model use when guarded values are detected. | Security-review status, redacted guarded-value copy, reviewer actions, blocked promotion/export messaging. |
| `raw-identifier-risk` | `report_preview` | Allow aggregate-only review while keeping identifiers out of report-ready and LLM output. | Identifier-risk status, aggregate-only confirmation, masking/removal action, no raw account/campaign/ad identifiers. |
| `no-benchmark-data` | `empty_benchmark_table` | Avoid fabricating benchmark evidence for empty scopes. | No usable benchmark copy, checked scope or filter hint, empty state without evidence styling. |

## Copy Expectations

Future UI copy should be short, visible near the affected metric or action, and
specific enough for a reviewer to know what to do next.

Expected copy patterns:

- `benchmark-ready`: "Benchmark basis is visible with the metric."
- `low-confidence`: "Low confidence reason is shown before report/export action."
- `long-term-trend-only`: "Recent benchmark and trend-only data are separated."
- `validation-error`: "Missing required field: spend."
- `security-review-required`: "Security review is required before promotion."
- `raw-identifier-risk`: "Raw identifiers were excluded from report-ready output."
- `no-benchmark-data`: "No usable aggregate benchmark exists for this selection."

Copy rules:

- Show limitation or blocked-state copy before the user can export, promote, or
  rely on a benchmark.
- Keep benchmark basis labels close to the metric, not buried in a tooltip-only
  treatment.
- Use reviewer-action language for next steps.
- Do not imply production validation when the fixture is synthetic.
- Do not collapse `no-benchmark-data`, `validation-error`, and
  `security-review-required` into one generic failure state.

## Blocked Outputs

Future UI and test work should preserve these blocked outputs from the fixture
contract:

| Trust state | Blocked outputs |
| --- | --- |
| `benchmark-ready` | Benchmark import, DB promotion, LLM prompt payload until a separate approval exists. |
| `low-confidence` | Overclaiming forecast copy and report export without confidence reason. |
| `long-term-trend-only` | Default benchmark use and mixed recent/stale benchmark cards. |
| `validation-error` | Storage, benchmark promotion, model use, and report-ready output. |
| `security-review-required` | Normalized preview, benchmark promotion, report export, and LLM prompt payload. |
| `raw-identifier-risk` | Raw identifier display and LLM prompt payload with identifiers. |
| `no-benchmark-data` | Forecast fabrication and empty source shells shown as evidence. |

## Redaction And Safety Expectations

Future UI mapping must keep customer-facing and reviewer-facing surfaces free
of:

- raw account, campaign, ad set, ad, advertiser, row-level, or private
  benchmark values
- credential-like values, tokens, cookies, sessions, secrets, URLs, or private
  paths
- raw file payloads or production dashboard exports
- LLM prompt payloads containing benchmark rows or identifiers
- production-only labels that imply real benchmark import or DB promotion

Synthetic labels such as `synthetic_local_fixture` may appear in QA-only
fixture output. Product UI should use reviewed user-facing wording if a future
implementation gate approves UI changes.

## Validation Plan

For this plan-only gate:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_benchmark_qa_4_ui_state_mapping_plan_v1.md
npm run benchmark:ui-fixtures
```

For a future implementation gate, request approval before running broader
checks. Candidate local checks after exact paths are approved:

```text
npm run benchmark:ui-fixtures
npm run benchmark:dry-run
npm run lint
npx tsc --noEmit
npm run build
```

Future component or route tests should assert:

- all seven trust states resolve to exactly one UI treatment
- limitation, error, security, and empty states block their listed outputs
- benchmark basis copy remains visible near the metric or affected action
- no raw identifiers, URLs, credential-like values, or row-level data render
- long-term trend data is not styled as current benchmark evidence
- empty benchmark scopes do not fabricate forecasts or evidence shells

## Next Gate Suggestions

Recommended next gates:

1. `Foresight-Benchmark-QA-5-Component-Or-Route-Test-Approval`
   - Approve exact test target paths, fixture import strategy, and local
     validation commands before writing tests.

2. `Foresight-Benchmark-QA-6-UI-State-Test-Implementation`
   - Add local tests only after QA-5 approves target files. Keep production,
     DB, import, upload, Meta API, env, and retraining work out of scope.

3. `Foresight-Benchmark-Import-Approval`
   - Separate future gate for any real benchmark ingestion, with source
     provenance, operator approval, privacy handling, DB target, rollback plan,
     and explicit approval for non-mock execution.

## No-Touch Confirmation

This plan does not perform:

- code, UI, script, package, lockfile, or TypeScript config edits
- SQL execution
- DB read/write, schema, migration, import, upload, or storage work
- Meta API calls
- Python retrain or model work
- environment, secret, token, cookie, credential, or session access
- production calls or authenticated production browser checks
- commit or push
