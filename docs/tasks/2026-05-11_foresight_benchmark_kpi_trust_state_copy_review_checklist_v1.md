# Foresight Benchmark KPI Trust-State Copy Review Checklist v1

Date: 2026-05-11
Gate: Foresight-Benchmark-KPI-Trust-State-Copy-Review
Status: drafted
Repo: admate-foresight

## Purpose

Provide a documentation-only checklist for reviewing benchmark KPI and trust
state copy before any future UI, report, export, model, or benchmark promotion
work relies on it.

This checklist covers blocked, warning, low-confidence, unavailable,
long-term-trend-only, and security-review-required states. It is intended for
copy, product QA, and reviewer workflow review only. It does not approve SQL,
DB reads or writes, benchmark import/upload, Meta API calls, Python retraining,
production execution, or mock-to-real benchmark promotion.

## Review Scope

Review all visible KPI and benchmark trust-state copy that can appear near:

- KPI cards
- benchmark basis labels
- confidence labels
- blocked output lists
- forecast or report previews
- trend tables
- empty benchmark states
- upload or mapping remediation panels
- reviewer action prompts

The reviewer should confirm that each state answers four questions:

1. What is the current trust state?
2. Why is the metric limited, blocked, or unavailable?
3. What can the reviewer do next?
4. Which outputs remain blocked until a separate approval gate exists?

## State Checklist

| State | Required user-facing meaning | Required reviewer action | Must not imply |
| --- | --- | --- | --- |
| `blocked` | The metric, benchmark, export, report, promotion, or model use is stopped until the listed issue is resolved. | Fix the blocking issue, request corrected data, or route to the named review owner. | That the system calculated a safe value anyway. |
| `warning` | The metric may be visible, but a limitation affects interpretation or approval. | Review the warning reason before using the metric in reports or decisions. | That the warning is cosmetic or optional. |
| `low-confidence` | Evidence is insufficient or coverage is weak, so forecast/report claims must be constrained. | Review basis, sample coverage, and confidence reason before export or stakeholder use. | That directional guidance is a validated forecast. |
| `unavailable` | No usable aggregate benchmark exists for the current scope, filter, field, or window. | Adjust filters, choose another scope, or request a reviewed aggregate source. | That the product has inferred or fabricated a benchmark. |
| `long-term-trend-only` | Older data can support trend context only and is excluded from current default benchmark evidence. | Keep trend reference separate from current KPI benchmark claims. | That stale data is current benchmark evidence. |
| `security-review-required` | Guarded, sensitive, credential-like, private, or identifier-bearing source content requires security review before use. | Stop promotion/export/model use and route to security or data owner review. | That redaction alone makes the benchmark safe to promote. |

## Korean UI Copy Principles

Korean copy should be direct, short, and action-oriented. Prefer plain reviewer
language over marketing language.

Approved principles:

- Use factual state labels: `검토 필요`, `사용 제한`, `근거 부족`, `현재 사용 불가`,
  `장기 추세 참고용`, `보안 검토 필요`.
- Put the limitation before the action: `근거가 부족해 보고서 내보내기가 제한됩니다.`
- Name the next action: `표본 수와 기간을 확인해 주세요.`
- Keep benchmark basis near the metric: platform, objective, metric, window,
  sample/coverage, currency/net basis.
- Use `참고`, `제한`, `확인 필요`, `검토 후 사용` for uncertain states.
- Use `승인됨`, `검증됨`, `확정`, `예측 완료` only when a separate approval
  gate explicitly supports that claim.
- Avoid blame-oriented wording. Prefer `필수 항목이 누락되었습니다` over
  `잘못된 파일입니다`.
- For blocked states, make the blocked output visible: `보고서 내보내기와
  벤치마크 승인이 차단되었습니다.`

Example patterns:

| State | Preferred Korean copy pattern | Avoid |
| --- | --- | --- |
| `blocked` | `필수 근거가 없어 이 KPI는 사용할 수 없습니다.` | `일부 데이터만으로 계산했습니다.` |
| `warning` | `해석 전 제한 사항을 확인해 주세요.` | `문제없음` |
| `low-confidence` | `표본 수가 낮아 예측 문구를 제한합니다.` | `성과를 예측했습니다.` |
| `unavailable` | `이 조건에 사용할 수 있는 집계 벤치마크가 없습니다.` | `유사 기준으로 대체했습니다.` |
| `long-term-trend-only` | `장기 추세 참고용이며 현재 벤치마크에는 포함되지 않습니다.` | `현재 업종 평균` |
| `security-review-required` | `보안 검토 전에는 미리보기와 내보내기를 사용할 수 없습니다.` | `민감 값은 숨겼으니 사용 가능합니다.` |

## Forbidden Overclaiming

Reject copy that does any of the following:

- Presents synthetic, mock, fixture, or local dry-run data as real benchmark
  evidence.
- Says or implies `industry average`, `validated`, `approved`, `production
  benchmark`, `real Meta benchmark`, or `report-ready` without a recorded
  approval gate.
- Converts low-confidence guidance into deterministic forecast language.
- Hides confidence, sample, date-window, currency, net/gross, or basis
  limitations in tooltip-only copy.
- Labels long-term trend data as a current KPI benchmark.
- Treats redacted security-risk data as automatically safe for promotion.
- Shows empty benchmark scopes as evidence shells, placeholder forecasts, or
  inferred averages.
- Suggests the user can export, promote, upload, import, retrain, or send data
  to an LLM when blocked outputs list that action.
- Mentions raw account, campaign, ad set, ad, advertiser, row-level, URL,
  credential-like, cookie, token, session, file path, or private benchmark
  values.

## Reviewer Action Mapping

| Condition found in copy review | Reviewer action label | Expected product behavior |
| --- | --- | --- |
| Missing required metric field or zero denominator | `request_corrected_source` | Block metric use, promotion, report-ready output, and model use. |
| Weak sample or coverage | `review_basis_before_export` | Keep confidence reason visible before export/report action. |
| Mixed currency, unknown net/gross, or unknown markup basis | `confirm_financial_basis` | Show basis limitation and block automatic approval. |
| Long-term-only data window | `separate_trend_from_current_benchmark` | Show trend-only language and prevent default benchmark styling. |
| No aggregate benchmark for current scope | `adjust_filters_or_request_reviewed_source` | Show unavailable copy without fabricating forecasts. |
| Raw identifiers or private values present | `remove_identifiers_or_aggregate_only` | Allow aggregate-only review only when identifiers stay out of output. |
| URL, token, credential-like, session, cookie, or private path present | `route_to_security_review` | Block preview, export, promotion, and LLM payloads. |
| Copy claims production readiness for mock data | `rewrite_as_synthetic_local_only` | Replace overclaiming copy and keep promotion blocked. |

Reviewer action copy should be visible enough that a non-engineering reviewer
can decide the next step without reading logs, fixture files, database rows, or
raw benchmark sources.

## No-Mock-To-Real Promotion Boundary

Mock, fixture, dry-run, synthetic, or local-only benchmark states must never be
promoted to real benchmark trust by copy changes alone.

The boundary is blocked unless a future human-gated artifact records:

- real source provenance and owner
- approved data handling and privacy review
- exact import/upload path
- DB target, rollback plan, and audit trail
- security review for identifiers, URLs, credential-like values, private paths,
  and row-level data
- reviewer acceptance criteria for confidence, sample coverage, date window,
  currency, net/gross basis, and metric definitions
- explicit approval for non-mock execution

Copy review may approve safer wording. It cannot approve:

- benchmark import
- benchmark upload
- DB promotion
- report-ready export
- LLM prompt payload use
- production use
- Python retrain or model use
- Meta API calls

## Acceptance Checklist

Before copy is accepted, confirm:

- Each covered state has a distinct label and does not collapse into a generic
  error message.
- The state label, reason, benchmark basis, and next action are visible near
  the affected KPI or action.
- Korean copy uses limitation-first wording for blocked and low-confidence
  states.
- Warnings explain the decision impact, not just that something happened.
- Unavailable states do not show placeholder evidence or inferred averages.
- Long-term trend-only states are visually and textually separated from current
  benchmark states.
- Security-review-required states block preview, export, promotion, report,
  model, and LLM payload use until separately approved.
- Blocked outputs are named in user-facing or reviewer-facing copy.
- Synthetic/local fixture context is not rewritten as production evidence.
- No raw identifiers, credentials, URLs, sessions, cookies, private paths, or
  row-level values appear in copy.

## Validation Plan

For this documentation-only gate:

```text
git diff --check -- docs/tasks/2026-05-11_foresight_benchmark_kpi_trust_state_copy_review_checklist_v1.md
npm run benchmark:dry-run
```

`npm run benchmark:dry-run` is reasonable only while it remains the local inline
mock harness and reports no DB write, Meta API call, LLM call, Python retrain,
raw file creation, production call, benchmark import, or benchmark upload.

Do not run production, SQL, Meta, Python, import, upload, or benchmark
promotion commands as part of this checklist.

## No-Touch Confirmation

This checklist does not perform:

- code, asset, package, lockfile, or TypeScript config edits
- SQL execution
- DB read/write, schema, migration, import, upload, or storage work
- Meta API calls
- Python retrain or model work
- benchmark import, upload, or promotion
- environment, secret, token, cookie, credential, session, or private file
  access
- production calls or authenticated production browser checks
- commit or push

## Next Gate Suggestions

Recommended next gates:

1. `Foresight-Benchmark-KPI-Copy-QA-Result`
   - Record product/copy reviewer findings against this checklist.

2. `Foresight-Benchmark-KPI-Copy-Test-Approval`
   - Approve exact local component or route test targets if copy assertions
     should be automated.

3. `Foresight-Benchmark-Real-Source-Promotion-Approval`
   - Separate human-gated artifact for any future non-mock benchmark source,
     import/upload path, DB target, security review, and rollback plan.
