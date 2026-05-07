# AdMate Foresight Benchmark Reviewer Workflow v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-7 reviewer workflow and dry-run report UX design

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Gate Foresight-Benchmark-6에서 구현한 local dry-run harness 결과를 운영자가 어떻게 검토하고 승인, 반려, 보류, 수정 요청으로 판정할지 정의한다.

이번 Gate는 workflow와 report UX 설계만 수행한다. 코드, API route, DB schema, import/export, Meta API 호출, Python retrain, raw Excel/CSV/model artifact 추가는 범위에 포함하지 않는다.

핵심 원칙:

```text
Dry-run report is review evidence.
Reviewer decision is not DB promotion.
Approved normalized benchmark dataset remains the source of truth.
Raw campaign-level data never goes to LLM or report-ready output.
```

## 2. Scope and Non-scope

### 2.1 Scope

- benchmark upload reviewer workflow 설계
- dry-run report UX 섹션과 상태별 표시 기준 설계
- approve, approve with warning, reject, correction required, long-term trend only, aggregate-only 판정 기준 정의
- uploader, reviewer, admin, data steward, audit actor 권한 경계 정의
- audit/operator event 후보 정의
- raw data and privacy boundary 정의
- 후속 Gate 제안

### 2.2 Non-scope

- upload UI 구현
- dry-run API route 구현
- normalized benchmark DB schema 구현
- DB connection, import, export, migration
- Meta API direct pull
- Python retrain 실행
- LLM report endpoint 구현
- raw Excel/CSV/model artifact 추가
- commit, push, PR 생성

## 3. Current Input Contract

Benchmark-6 harness는 현재 local inline mock 기반이며 실제 파일 parser가 아니다. 운영 workflow 설계는 아래 output shape를 기준으로 한다.

Required dry-run report sections:

```text
file_summary
sheet_summary
mapping_report
accepted_columns
rejected_columns
missing_required_fields
warnings
derived_metric_preview
privacy_findings
reviewer_action_required
normalized_preview_sample
```

Key status fields:

| Field | Meaning for reviewer |
| --- | --- |
| `mapping_report.validation_status` | `passed`, `warning`, `failed`, `security_failed` 중 하나. 1차 상태 배지로 사용한다. |
| `mapping_report.approval_status` | dry-run 기준 후보 상태. 실제 normalized dataset 승인과 구분한다. |
| `mapping_report.approval_blockers` | 승인 전 반드시 해소할 차단 사유. |
| `mapping_report.window_policy` | recent benchmark, long-term trend, mixed window, date unparseable 구분. |
| `mapping_report.excluded_from_default_benchmark` | default recent benchmark 사용 가능 여부. |
| `privacy_findings.llm_boundary_status` | LLM/report-ready output 가능 범위. |
| `reviewer_action_required[]` | reviewer 또는 uploader가 취해야 할 다음 행동. |

The current CLI script also reports side-effect flags:

```text
db_write = false
meta_api_call = false
llm_call = false
python_retrain = false
raw_file_created = false
```

Reviewer UX should preserve this side-effect summary so operators can see that dry-run did not promote, write, call, train, or forward data.

## 4. Reviewer Workflow

### 4.1 State Flow

Recommended MVP review flow:

```text
upload received
→ dry-run executed
→ report generated
→ reviewer checks
→ decision recorded
→ correction/rejection/approval outcome
→ raw file handled by retention policy
→ separate normalized dataset promotion gate, if approved
```

No step in this workflow writes benchmark facts to DB, triggers Meta API, trains models, or sends raw rows to LLM.

### 4.2 Upload Received

Uploader submits a candidate dashboard export or Meta-compatible manual export together with required metadata.

Minimum intake metadata:

- `platform`
- `source_type`
- `exported_at`
- `date_range`
- `timezone`
- `currency`
- `net_or_gross`
- `markup_policy`
- `aggregation_level`
- `uploader`

At upload receipt:

- source file is treated as source evidence, not source of truth.
- file path or raw filename should not appear in report-ready output.
- source hash may be recorded as sanitized lineage metadata after policy approval.
- if storage has not been approved, raw file should remain temporary and local/restricted only.

### 4.3 Dry-run Executed

Dry-run should be run before any storage, normalized dataset promotion, model training, API sync, or LLM/report use.

Execution expectations:

- local/CLI or internal reviewer-only harness first
- deterministic column mapping and metric preview
- fail-closed privacy/security scan
- no DB write
- no Meta API call
- no LLM call
- no Python retrain
- no raw artifact creation in repo

### 4.4 Report Generated

The generated report becomes the reviewer packet. It should include only sanitized structure, field names, status values, counts, patterns, and reviewer actions.

Report must not include:

- raw campaign-level rows
- advertiser name
- account id/name
- campaign id/name
- adset/ad id/name
- token, credential, session URL, or signed request URL
- raw row-level spend/click/impression series tied to identifiers

### 4.5 Reviewer Checks

Reviewer checks should be completed in this order:

1. Confirm `validation_status`.
2. Confirm `approval_blockers`.
3. Check `missing_required_fields`.
4. Check `privacy_findings`.
5. Check `warnings`.
6. Check `derived_metric_preview`.
7. Check `normalized_preview_sample`.
8. Confirm `reviewer_action_required`.
9. Decide outcome.

High-risk findings should be reviewed before quality warnings. For example, `security_failed` ends review immediately and should not be treated as a normal correction flow.

### 4.6 Approve for Normalized Benchmark

Approval for normalized benchmark means the candidate can move to a later normalized dataset design/promotion process. It does not mean raw file import or DB write in this Gate.

Approval prerequisites:

- `validation_status = passed`, or `warning` with explicit reviewer acceptance.
- no `security_failed`.
- no missing required fields.
- no unresolved `approval_blockers`.
- `privacy_findings.llm_boundary_status` is `safe_aggregate_only`, or `safe_only_if_aggregate` with identifier handling accepted.
- recent benchmark and long-term trend windows are separated.
- currency and Net/Gross basis are explicit.
- reviewer confirms the source template is acceptable.

### 4.7 Reject

Reject when the candidate cannot be used safely or structurally.

Mandatory reject triggers:

- `validation_status = security_failed`
- secret/session/credential-like field detected
- required field missing and uploader cannot correct metadata/source
- date range unparseable
- non-numeric core metrics for impressions or clicks
- raw identifier fields are configured for LLM/report-ready output
- source file appears to be raw API response archive or uncontrolled cache
- mixed recent and long-term windows cannot be split

Reject output should include remediation categories, not raw examples.

### 4.8 Request Correction

Correction required means the candidate may be resubmitted after metadata, template, or export issues are fixed.

Correction examples:

- missing `spend`
- missing `currency`
- missing `net_or_gross`
- missing `markup_policy`
- mixed currency without split
- reach semantics not confirmed
- duplicate or ambiguous columns
- insufficient upload metadata
- wrong sheet selected

Correction request should identify field names and policy issues only.

### 4.9 Archive Raw File / Do Not Store Raw File Policy

Default MVP policy:

- Do not store raw file in repo.
- Do not store raw file in normalized benchmark dataset.
- Do not send raw file or row dump to LLM.
- Store no raw file by default until retention and access control are approved.

If raw source evidence retention is later approved:

- keep raw file in restricted storage only.
- record source hash and sanitized metadata.
- restrict access to uploader, reviewer, admin, and approved data steward.
- set retention expiry.
- never expose raw path or raw identifiers in planner/report output.

## 5. Dry-run Report UX

### 5.1 Layout Candidate

Reviewer report should use a stacked, scan-first layout:

1. Status summary
2. Required field and blocker panel
3. Privacy/security panel
4. Warnings and reviewer actions
5. Mapping summary
6. Derived metric preview
7. Normalized preview sample
8. Audit/operator event preview

The first viewport should show decision-critical information:

- `validation_status`
- `approval_status`
- blocker count
- warning count
- privacy status
- recommended next action

### 5.2 Status Summary

Status summary should display:

| Display field | Source field | UX treatment |
| --- | --- | --- |
| Dry-run status | `mapping_report.validation_status` | Primary badge |
| Candidate approval status | `mapping_report.approval_status` | Secondary badge |
| Window policy | `mapping_report.window_policy` | Recent/trend badge |
| Default benchmark eligibility | `excluded_from_default_benchmark` | Boolean label |
| Side effects | CLI/script side-effect flags | All false in dry-run |
| Source type | `mapping_report.source_type` | Metadata label |

Status state meanings:

| State | Reviewer meaning | Default action |
| --- | --- | --- |
| `passed` | Required structure and safety checks passed | Review and approve for normalized design flow |
| `warning` | Not automatically rejected, but limitations require reviewer decision | Approve with warning, request correction, trend-only, or aggregate-only |
| `failed` | Required validation failed | Reject or request correction |
| `security_failed` | Secret/session/privacy risk detected | Stop review and request security review/new export |

### 5.3 Missing Required Fields

Missing required fields should be shown as a blocking checklist.

Required fields:

- `platform`
- `source_type`
- `date_start`
- `date_stop`
- `objective`
- `optimization_goal`
- `spend`
- `currency`
- `impressions`
- `clicks`

UX rules:

- Show canonical field name.
- Show whether metadata can supply the field.
- Show remediation hint.
- Do not show raw row examples.
- If any required field is missing, block storage, LLM/report-ready output, model use, and normalized promotion.

### 5.4 Warnings

Warnings should be grouped by decision type:

| Warning family | Examples | Reviewer options |
| --- | --- | --- |
| Commercial basis | unknown Net/Gross, unknown markup policy | request metadata or approve with limitation |
| Data split | mixed currency, mixed breakdown, mixed date window | require split |
| Quality | short period, low sample size, objective imbalance | approve with warning or request more sample |
| Metric | zero denominator, suspicious metric | request correction or mark limited |
| Trend policy | long-term only | approve trend-only |
| Privacy | identifier columns present | aggregate-only or remove/mask identifiers |

Warnings should not be hidden behind a generic badge. Each warning should have an explicit reviewer decision.

### 5.5 Privacy Findings

Privacy panel should be above normalized preview.

Show:

- identifier columns detected: yes/no
- identifier groups detected: account, campaign, adset, ad, advertiser
- advertiser/brand columns detected: yes/no
- raw identifier output risk: yes/no
- secret-like value detected: yes/no
- URL-like value detected: yes/no
- LLM boundary status
- recommended action

Do not show:

- raw identifier values
- raw URLs
- credential-bearing query text
- campaign names
- advertiser names

UX states:

| LLM boundary status | Meaning | UX action |
| --- | --- | --- |
| `safe_aggregate_only` | Aggregate canonical fields only may proceed | allow reviewer approval path |
| `safe_only_if_aggregate` | Identifier-heavy source can proceed only if outputs remain aggregate/masked | require identifier handling confirmation |
| `blocked_security_review` | Secret/session-like risk | block preview and require security review |

### 5.6 Derived Metric Preview

Derived metric preview should show deterministic calculation status, not raw row values.

Display:

- CPM status
- CPC status
- CTR status
- frequency status
- zero division findings
- suspicious metric findings
- metric reconciliation status
- aggregate preview values, if safe and available

Rules:

- show null or blocked status instead of zero fallback.
- never ask LLM to calculate or reinterpret metrics.
- show metric values only as aggregate preview, never as row-level campaign facts.
- mark frequency unavailable when reach is missing or unconfirmed.

### 5.7 Normalized Preview Sample

Normalized preview sample is a masked pattern sample for reviewer orientation.

Allowed fields:

- `platform`
- `source_type`
- `date_grain`
- `date_start_pattern`
- `date_stop_pattern`
- `objective_mapping_status`
- `optimization_goal_mapping_status`
- `currency`
- `net_or_gross`
- `impressions_present`
- `clicks_present`
- `spend_present`
- `reach_status`
- `derived_metric_status`
- `warning_codes`

If `security_failed`, normalized preview sample should be empty or hidden. The UI should explain that preview was blocked for safety without showing the unsafe value.

### 5.8 Reviewer Action Required

`reviewer_action_required[]` should drive the CTA area.

Action mapping:

| Action type | UX CTA | Blocking |
| --- | --- | --- |
| `confirm_approval` | Approve for normalized benchmark design | No |
| `provide_missing_metadata` | Request correction | Yes |
| `select_sheet` | Ask uploader/reviewer to select sheet | Usually yes |
| `confirm_header_row` | Confirm mapping/header | Usually yes |
| `confirm_reach_semantics` | Confirm reach semantics | No, but frequency limited until resolved |
| `split_mixed_currency` | Request split by currency | Yes |
| `split_recent_and_long_term` | Request date-window split | Yes |
| `remove_or_mask_identifier_output` | Confirm aggregate-only/masking | Yes for report-ready use |
| `reject_and_request_new_export` | Reject and request new export | Yes |
| `approve_trend_only` | Approve as long-term trend only | No for trend, yes for default benchmark |
| `security_review` | Send to security review | Yes |

The UI should allow exactly one final decision per dry-run report version.

## 6. Decision Criteria

### 6.1 Approve

Use when:

- `validation_status = passed`
- no missing required fields
- no privacy/security blocker
- no unresolved warnings
- recent 6-month window is valid
- currency, Net/Gross, markup policy are explicit

Result:

```text
review_decision = approve_for_normalized_benchmark
raw_file_policy = follow retention decision
normalized_promotion = pending separate Gate
```

### 6.2 Approve With Warning

Use when:

- `validation_status = warning`
- warnings are understood and accepted
- no security blocker exists
- required fields are present
- limitation text is stored with the reviewer decision

Examples:

- reach missing but frequency is disabled
- sample size low but reviewer approves limitation
- Net/Gross clarified after review note

Result:

```text
review_decision = approve_with_warning
limitation_required = true
default_benchmark_use = depends on warning type
```

### 6.3 Reject

Use when:

- `security_failed`
- required data cannot be corrected
- raw campaign identifiers would enter report-ready or LLM output
- date or metric quality makes deterministic validation impossible

Result:

```text
review_decision = reject
normalized_promotion = blocked
raw_file_retention = delete_or_restricted_security_hold
```

### 6.4 Correction Required

Use when the file could pass after resubmission or metadata correction.

Examples:

- missing spend
- missing currency
- mixed currency
- wrong sheet
- unclear header row
- missing source metadata

Result:

```text
review_decision = correction_required
uploader_action = resubmit_export_or_metadata
normalized_promotion = blocked_until_new_dry_run
```

### 6.5 Long-term Trend Only

Use when:

- `window_policy = long_term_trend`
- data is valid but older than recent 6-month benchmark window
- reviewer wants to preserve seasonal or historical reference value

Result:

```text
review_decision = approve_trend_only
excluded_from_default_benchmark = true
report_limitation = long-term trend only
```

### 6.6 Aggregate-only

Use when:

- identifier-heavy source is structurally valid
- raw identifiers are not needed outside restricted review/lineage
- report and LLM payload can use only anonymized aggregate canonical fields

Result:

```text
review_decision = approve_aggregate_only
identifier_policy = raw-zone_or_review-only
llm_boundary = aggregate_only
```

## 7. Role and Permission Model

### 7.1 Uploader

Can:

- submit candidate file and metadata
- run or request dry-run
- respond to correction requests
- view own upload status and non-sensitive validation errors

Cannot:

- approve own upload for benchmark use
- promote to normalized dataset
- view secret-like findings values
- send raw campaign rows to LLM
- trigger DB import, Meta sync, or retrain

### 7.2 Reviewer

Can:

- view sanitized dry-run report
- inspect restricted raw evidence if policy permits
- accept warnings with reason
- reject or request correction
- approve for normalized benchmark design flow

Cannot:

- bypass security_failed status
- promote raw file directly into production benchmark DB
- expose raw identifiers in report/LLM outputs
- trigger retrain or Meta sync from the review screen

### 7.3 Admin

Can:

- manage reviewer assignments
- override workflow routing with audit reason
- place security hold
- approve retention exception under policy

Cannot:

- bypass secret redaction
- commit raw files to repo
- enable DB/API/migration automation without separate approved Gate

### 7.4 Data Steward

Can:

- own canonical taxonomy decisions
- confirm objective and optimization_goal mapping
- confirm reach semantics
- decide whether identifiers are required for dedupe/lineage
- define sample sufficiency and imbalance thresholds

Cannot:

- use raw advertiser/campaign names in LLM/report payload
- silently convert currency or Net/Gross basis without policy

### 7.5 Audit Actor

Audit actor is the sanitized identity reference attached to events. It may represent uploader, reviewer, admin, system dry-run job, or data steward.

Audit actor records should include role and reference id, not raw personal details unless approved by Agent Core policy.

### 7.6 Ordinary User

Ordinary product users have no direct benchmark promotion permissions.

They may later consume approved aggregate benchmark outputs, but must not access:

- raw upload files
- raw campaign-level rows
- reviewer-only metadata
- identifier columns
- security findings values

## 8. Audit and Operator Events

This Gate defines event candidates only. It does not implement audit storage.

| Event | Trigger | Required fields | Forbidden fields |
| --- | --- | --- | --- |
| `benchmark_upload_submitted` | uploader submits candidate | actor, timestamp, source_type, source_hash, metadata completeness | raw file path, raw rows, identifiers |
| `benchmark_dry_run_completed` | harness returns report | actor/system, timestamp, validation_status, warning_count, blocker_count, report version | raw rows, secret values |
| `benchmark_review_requested` | report enters reviewer queue | actor, reviewer target, reason, priority | raw advertiser/campaign names |
| `benchmark_approved` | reviewer approves candidate | reviewer actor, decision reason, accepted warnings, limitations | raw row values |
| `benchmark_rejected` | reviewer rejects candidate | reviewer actor, reject reason codes, remediation category | raw unsafe examples |
| `benchmark_correction_requested` | reviewer requests correction | reviewer actor, missing fields, correction reason | raw file values |
| `benchmark_promoted_to_normalized_dataset` | later Gate promotes approved aggregate | actor, normalized dataset version, source hash, row/aggregate counts | raw file, raw identifiers |

Additional event candidates:

- `benchmark_security_review_requested`
- `benchmark_raw_file_retention_expired`
- `benchmark_approval_revoked`
- `benchmark_mapping_reviewed`

Audit logging rules:

- log counts, reason codes, actor reference, trace id, source hash, mapping version.
- never log token, credential, raw row, raw provider response, campaign name, account name, advertiser name.
- every manual override requires reason and actor.

## 9. Raw Data and Privacy Boundary

### 9.1 Raw File Retention Policy Candidate

Default:

```text
raw_file_retention = do_not_store
```

Allowed candidate alternatives for later policy:

| Policy | Meaning | Requirement |
| --- | --- | --- |
| `do_not_store` | raw file is discarded after dry-run decision | default MVP |
| `temporary_restricted_hold` | raw file retained briefly for correction/security review | retention expiry and access control required |
| `restricted_source_evidence` | raw file retained as lineage evidence | admin/data steward approval required |
| `security_hold` | file retained for security investigation | security owner required |

Raw files must never be committed to repo.

### 9.2 Identifier Masking

Campaign/account/ad identifiers may be detected for lineage but must stay outside report-ready and LLM output.

Rules:

- identifier columns are review-only or raw-zone.
- normalized preview may show presence flags or group names only.
- normalized benchmark may later store approved hash/count/taxonomy, not raw names.
- advertiser or brand names are masked or held from normalized benchmark until taxonomy policy exists.

### 9.3 LLM Boundary

LLM may receive only:

- aggregate canonical benchmark summaries
- warnings and limitations
- sample count and date window
- deterministic metric outputs
- anonymized trend summaries

LLM must not receive:

- raw campaign-level rows
- raw identifiers
- advertiser/campaign/account/ad names
- raw URLs or credential-bearing fields
- row-level spend/click/impression series
- reviewer-only notes containing sensitive context

### 9.4 Report-ready Aggregate Only

Planner/report outputs may show:

- aggregate CPM/CPC/CTR/frequency benchmark values
- objective/optimization_goal cohort labels
- date window labels
- sample sufficiency labels
- currency and Net/Gross basis
- warnings and limitations

Planner/report outputs must not show source row examples or raw source file details.

### 9.5 Smoke/Test Data Exclusion

Smoke and mock data from harness execution must not be promoted to benchmark.

Rules:

- `inline_mock` and future synthetic fixture data are test-only.
- test case names are not dataset lineage.
- mock outputs can validate behavior but cannot seed normalized benchmark facts.
- reports generated from mock cases should be labeled non-production.

## 10. Report UX State Matrix

| Dry-run state | Banner | Primary CTA | Secondary CTA | Promotion status |
| --- | --- | --- | --- | --- |
| `passed` | Ready for reviewer approval | Approve for normalized design | Request correction | Eligible for later normalized Gate |
| `warning` | Review required | Approve with warning / trend-only / aggregate-only | Request correction | Conditional |
| `failed` | Validation failed | Request correction | Reject | Blocked |
| `security_failed` | Security review required | Reject and request new export | Security review | Blocked |

Recommended color/priority semantics:

- `security_failed`: highest severity, block preview.
- `failed`: blocking validation problem.
- `warning`: reviewer decision required.
- `passed`: ready but still requires human approval.

## 11. Benchmark Promotion Boundary

Reviewer approval is not enough to write benchmark facts.

Promotion requires a separate approved Gate that defines:

- normalized benchmark schema
- aggregate grain
- source hash lineage
- identifier hash policy
- retention policy
- import/migration plan
- audit storage
- rollback process
- verification commands

Until then:

```text
approve_for_normalized_benchmark = permission to design/pipeline next step
not = DB insert/import/migration
```

## 12. Open Questions

1. Who owns final reviewer assignment for benchmark uploads?
2. Where should sanitized dry-run reports be stored, if anywhere?
3. What is the raw file retention period for rejected, corrected, and approved candidates?
4. What role confirms reach semantics for `Unique Imps.` or dashboard-specific reach aliases?
5. What sample size threshold is required before approve with warning becomes disallowed?
6. Should uploader see privacy/security categories, or only reviewer/security?
7. Which Agent Core audit stream will own benchmark review events?
8. Which taxonomy source owns objective and optimization_goal canonical labels?

## 13. Next Gates

### Foresight-Benchmark-8: Reviewer Report UI/API Design

Scope candidate:

- design reviewer UI screens and API contract
- define auth guard and role boundary
- define report storage decision
- still no DB promotion unless separately approved

### Foresight-Benchmark-9: Normalized Benchmark Schema Proposal

Scope candidate:

- propose normalized benchmark aggregate schema
- define grain, required metadata, source hash, approval status
- define identifier hash/count policy
- no migration/import until approved

### Foresight-Security-6: Audit/Rate-limit Implementation Plan

Scope candidate:

- plan audit event storage and rate limit controls for upload/dry-run/review
- define operator trace id and redaction policy
- align with guarded meta-sync/retrain surfaces

## 14. Final Recommendation

Benchmark-7 recommends a reviewer-first MVP workflow:

```text
1. Treat dry-run report as sanitized review evidence.
2. Block security_failed and missing required fields fail-closed.
3. Allow warnings only with explicit reviewer decision and limitation text.
4. Keep raw files out of repo, LLM, reports, and normalized benchmark by default.
5. Treat reviewer approval as permission for a later normalized dataset Gate, not as DB import.
```
