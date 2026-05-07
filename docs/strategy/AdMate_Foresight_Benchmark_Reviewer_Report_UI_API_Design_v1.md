# AdMate Foresight Benchmark Reviewer Report UI/API Design v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-8 reviewer report UI/API design

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Foresight benchmark dry-run 결과와 reviewer workflow를 실제 운영자 UI/API에서 어떻게 보여주고 처리할지 설계한다.

이번 Gate는 설계만 수행한다. 코드, API route, DB schema, migration, env, raw Excel/CSV/model artifact, Meta API 호출, Python retrain, LLM 호출은 범위에 포함하지 않는다.

핵심 원칙:

```text
Reviewer UI shows sanitized dry-run evidence.
API candidates are design contracts only.
Dry-run never promotes benchmark data.
Review decision never bypasses normalized dataset approval.
Raw campaign-level data never reaches LLM or report-ready output.
```

## 2. Scope and Non-scope

### 2.1 Scope

- reviewer report UI information architecture
- dry-run and review status model
- reviewer action design
- future API candidates and required guard conditions
- request/response shape candidates
- permission model
- data boundary
- Design Director review prompt linkage
- follow-up Gate proposal

### 2.2 Non-scope

- UI implementation
- API route implementation
- DB schema or migration writing
- upload parser expansion
- raw file storage implementation
- benchmark normalized dataset import
- Meta API direct pull
- Python retrain
- LLM report generation
- commit, push, PR creation

## 3. Current Inputs

This design follows the current Benchmark-6 dry-run report sections:

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

It also follows Benchmark-7 reviewer workflow:

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

The UI/API design must preserve dry-run side-effect boundaries:

```text
db_write = false
meta_api_call = false
llm_call = false
python_retrain = false
raw_file_created = false
```

## 4. UI IA

### 4.1 IA Overview

Recommended reviewer UI structure:

```text
Benchmark Review
  Upload / Dry-run Entry
  Dry-run Report Summary
  Mapping Table
  Missing Fields Panel
  Warnings Panel
  Privacy Findings Panel
  Derived Metric Preview
  Normalized Preview Sample
  Reviewer Decision Area
  Audit / Operator Event Preview
```

The first screen must answer three questions:

1. Is this candidate blocked?
2. Why is it blocked or limited?
3. What should the reviewer do next?

### 4.2 Upload / Dry-run Entry

Purpose:

- accept candidate source evidence and metadata for dry-run
- make clear that the operation is validation-only
- prevent users from confusing dry-run with benchmark import

UI elements:

| Section | Fields / Controls | Rules |
| --- | --- | --- |
| Source selector | file candidate, source type, sheet preference | raw path hidden from report-ready output |
| Required metadata | platform, date range, timezone, currency, Net/Gross, markup policy, aggregation level | missing metadata blocks approval |
| Execution mode | dry-run only | no DB, Meta, LLM, retrain toggle in MVP |
| Safety summary | no write/call/train flags | all must be false before execution |
| Run control | `Run dry-run` | disabled if role cannot execute dry-run |

MVP entry should be local/internal first. A public upload endpoint should not exist until guard, audit, rate limit, file size, and raw retention policies are approved.

### 4.3 Dry-run Report Summary

Purpose:

- provide a compact decision header
- show status, blockers, warnings, and recommended action

Display fields:

| UI label | Source field |
| --- | --- |
| Dry-run status | `mapping_report.validation_status` |
| Candidate status | `mapping_report.approval_status` |
| Source type | `mapping_report.source_type` |
| Window policy | `mapping_report.window_policy` |
| Default benchmark eligibility | inverse of `excluded_from_default_benchmark` |
| Blocker count | `approval_blockers.length` |
| Missing required count | `missing_required_fields.length` |
| Warning count | `warnings.length` |
| Privacy status | `privacy_findings.llm_boundary_status` |
| Next action | first blocking `reviewer_action_required` or recommended action |

Primary status cards:

- Ready for review
- Review required
- Validation failed
- Security review required
- Long-term trend only

### 4.4 Mapping Table

Purpose:

- show how source columns map to canonical benchmark fields
- expose confidence and rejected columns without raw data

Tabs:

- accepted columns
- rejected columns
- canonical field status

Accepted column table columns:

| Column | Source |
| --- | --- |
| Source sheet | `accepted_columns[].source_sheet` |
| Source column label | `source_column_masked_or_label` |
| Canonical field | `canonical_field` |
| Confidence | `mapping_confidence` |
| Parsed value type | `parsed_value_type` |
| Required | `required_field` |

Rejected column table columns:

| Column | Source |
| --- | --- |
| Source sheet | `rejected_columns[].source_sheet` |
| Source column label | `source_column_masked_or_label` |
| Reason | `reason_code` |
| Severity | `severity` |
| Reviewer action | `reviewer_action_required` |

Mapping UX rules:

- source labels that are identifiers must remain masked.
- rejected secret/session-like labels must not reveal values.
- confidence badges should use exact, alias, derived, missing, rejected.
- required missing canonical fields should link to Missing Fields Panel.
- table should be dense, sortable, and filterable by required/confidence/severity.

### 4.5 Missing Fields Panel

Purpose:

- make approval blockers obvious
- give uploader-oriented correction instructions

Panel behavior:

| Condition | UI behavior |
| --- | --- |
| no missing fields | collapsed success row |
| missing required fields | expanded blocker panel |
| metadata can satisfy field | show `provide metadata` remediation |
| source export must change | show `request new export` remediation |

Field display:

```text
canonical_field
required_for
detected_aliases
remediation_hint
blocks_storage
```

Rules:

- missing `spend`, `currency`, date, objective, optimization goal, impressions, or clicks blocks approval.
- panel should not show row examples.
- panel should drive `request correction` CTA.

### 4.6 Warnings Panel

Purpose:

- group non-blocking and conditionally blocking limitations
- require explicit reviewer handling

Warning groups:

| Group | Warning examples | Default CTA |
| --- | --- | --- |
| Currency and basis | mixed currency, unknown Net/Gross, unknown markup policy | correction or approve with limitation |
| Window policy | long-term only, mixed recent/long-term | trend-only or split |
| Metric quality | zero denominator, suspicious metric | correction or limitation |
| Mapping quality | alias confidence, duplicate column, unknown semantics | confirm mapping |
| Sample quality | short period, low sample size, objective imbalance | approve with warning or request more data |
| Privacy warning | identifier columns present | aggregate-only |

Warning row fields:

```text
warning_code
severity
affected_field
affected_sheet
affected_count_bucket
reviewer_decision_required
limitation_text_candidate
```

UX rules:

- every warning with `reviewer_decision_required = true` requires a reviewer note before final approval.
- warning count alone is not enough; show category and decision path.
- accepted warning limitations should become audit/report metadata later.

### 4.7 Privacy Findings Panel

Purpose:

- keep privacy/security above preview and decision
- fail closed before any report-ready output

Display fields:

```text
identifier_columns_detected
identifier_column_groups
advertiser_or_brand_columns_detected
raw_identifier_in_output_risk
secret_like_value_detected
url_like_value_detected
llm_boundary_status
recommended_action
```

UX state handling:

| Privacy state | UI treatment | Actions |
| --- | --- | --- |
| `safe_aggregate_only` | normal aggregate-safe badge | allow approval path |
| `safe_only_if_aggregate` | reviewer confirmation badge | allow aggregate-only path |
| `blocked_security_review` | high severity lock state | reject or security review only |

Panel rules:

- never show raw identifiers.
- never show raw URLs.
- never show credential-bearing query values.
- if secret/session-like risk exists, hide normalized preview.
- show categories and affected field names only.

### 4.8 Derived Metric Preview

Purpose:

- show deterministic calculation readiness
- clarify which benchmark metrics can be used

Metric rows:

| Metric | Source fields | Display |
| --- | --- | --- |
| CPM | spend, impressions | status and aggregate preview if safe |
| CPC | spend, clicks | status and aggregate preview if safe |
| CTR | clicks, impressions | status and aggregate preview if safe |
| Frequency | impressions, reach | status and aggregate preview if safe |

Display fields:

```text
cpm_status
cpc_status
ctr_status
frequency_status
zero_division_findings
suspicious_metric_findings
metric_reconciliation_status
aggregate_preview
```

Rules:

- deterministic only.
- null/blocked states must remain visible.
- no row-level campaign metric display.
- no LLM interpretation in this panel.
- if reach is missing, frequency displays blocked/limited.

### 4.9 Normalized Preview Sample

Purpose:

- show what report-ready canonical output would look like after masking
- reassure reviewer that raw identifiers are absent

Allowed preview fields:

```text
platform
source_type
date_grain
date_start_pattern
date_stop_pattern
objective_mapping_status
optimization_goal_mapping_status
currency
net_or_gross
impressions_present
clicks_present
spend_present
reach_status
derived_metric_status
warning_codes
```

Rules:

- show pattern rows only.
- do not show raw spend, clicks, impressions, campaign, account, ad, or advertiser values.
- hide panel on `security_failed`.
- label mock/smoke data as non-production.

### 4.10 Reviewer Decision Area

Purpose:

- convert report findings into one final reviewer decision for the current report version
- force rationale for warning, rejection, correction, trend-only, or aggregate-only outcomes

Decision CTAs:

- approve
- approve with warning
- reject
- request correction
- mark long-term trend only
- mark aggregate-only

Decision area fields:

| Field | Required when |
| --- | --- |
| decision | always |
| reviewer reason | approve with warning, reject, correction, trend-only, aggregate-only |
| accepted warning codes | approve with warning |
| correction fields | request correction |
| retention recommendation | reject, security review, approved |
| aggregate-only confirmation | identifier columns present |
| trend-only confirmation | long-term data |

Rules:

- ordinary users cannot see promotion CTA.
- uploader cannot approve own upload.
- reviewer decision does not write benchmark facts.
- promotion to normalized dataset must remain a separate Gate.

## 5. Status Model

### 5.1 Status List

| Status | Source / meaning | UI severity | Next action |
| --- | --- | --- | --- |
| `validated` | dry-run candidate approval status after passed validation | success | reviewer may approve for next Gate |
| `warning` | validation completed with reviewer-required limitations | warning | approve with warning, correction, trend-only, aggregate-only |
| `failed` | required validation failed | blocking | correction or reject |
| `security_failed` | secret/session/privacy safety failure | critical | security review or reject |
| `long_term_only` | valid but outside recent benchmark window | warning | mark long-term trend only |
| `correction_required` | reviewer decision requesting fix | blocking workflow state | uploader resubmits |
| `approved` | reviewer approved report version | success workflow state | eligible for normalized schema/promotion Gate |
| `rejected` | reviewer rejected report version | terminal workflow state | no promotion |

### 5.2 Mapping from Dry-run Fields

| Dry-run fields | UI status |
| --- | --- |
| `validation_status = passed`, `approval_status = validated` | `validated` |
| `validation_status = warning` | `warning` |
| `validation_status = failed` | `failed` |
| `validation_status = security_failed` | `security_failed` |
| `window_policy = long_term_trend` | add `long_term_only` modifier |
| reviewer selects request correction | `correction_required` |
| reviewer selects approve or approve with warning | `approved` with decision subtype |
| reviewer selects reject | `rejected` |

### 5.3 Status UX Rules

- `security_failed` overrides every other state.
- `failed` blocks approval unless correction creates a new dry-run report version.
- `warning` cannot become `approved` without reviewer reason.
- `long_term_only` cannot be used as default recent benchmark.
- `approved` does not mean DB promotion.
- `rejected` should preserve sanitized reason codes for audit.

## 6. Reviewer Actions

### 6.1 Approve

Use when:

- status is `validated`
- no missing required fields
- no unresolved blockers
- privacy status is aggregate-safe
- recent 6-month window is valid

Design behavior:

- require reviewer identity.
- require final confirmation that no raw data will be promoted in this step.
- create candidate audit event later.
- do not call DB import or migration.

### 6.2 Approve With Warning

Use when:

- dry-run has warnings but no hard blocker.
- reviewer accepts limitation text.
- affected metrics or cohort use is constrained.

Required review fields:

- accepted warning codes
- limitation text
- reviewer reason
- whether default benchmark use is allowed

### 6.3 Reject

Use when:

- `security_failed`
- required fields cannot be corrected
- unsafe data boundary cannot be resolved
- source type is disallowed

Design behavior:

- require reject reason code.
- show no raw unsafe values.
- mark raw retention as delete or restricted security hold by policy.

### 6.4 Request Correction

Use when:

- uploader can fix metadata or re-export file.
- missing/ambiguous fields can be corrected.

Required fields:

- correction reason
- missing fields or warning codes
- target owner: uploader, reviewer, data steward
- resubmission required flag

### 6.5 Mark Long-term Trend Only

Use when:

- `window_policy = long_term_trend`
- data is useful as historical reference
- default recent benchmark use must be blocked

Required fields:

- trend-only reason
- excluded from default benchmark confirmation
- date window label

### 6.6 Mark Aggregate-only

Use when:

- identifier columns exist but normalized/report output can remain aggregate.
- data steward/reviewer accepts masking and raw-zone boundary.

Required fields:

- identifier group summary
- aggregate-only confirmation
- raw-zone or review-only metadata decision
- LLM boundary confirmation

## 7. API Candidates

These API routes are candidates only. Do not implement until a later approved Gate.

### 7.1 `POST /api/benchmark/dry-run`

Purpose:

- execute dry-run on a candidate upload package
- return a sanitized dry-run report

Preconditions before implementation:

- authenticated uploader/reviewer/admin only
- fail-closed internal/admin guard in non-local runtime
- method allowlist
- file size and request size limit
- parser timeout
- no-store response
- audit event candidate
- rate limit per actor and per workspace
- no raw file persistence by default
- no DB write
- no Meta API call
- no Python retrain
- no LLM call

### 7.2 `GET /api/benchmark/reports/[id]`

Purpose:

- fetch a sanitized dry-run report for reviewer UI

Preconditions before implementation:

- report storage decision approved
- sanitized report only
- role-scoped access
- no raw rows
- no raw file path
- no secret/security value details
- audit read event candidate for restricted reports

### 7.3 `POST /api/benchmark/reports/[id]/review`

Purpose:

- record reviewer decision for one report version

Preconditions before implementation:

- reviewer/admin/data steward role validation
- uploader self-approval prevention
- idempotency key or report version check
- audit event
- no benchmark DB promotion side effect
- no raw file movement unless retention policy is approved
- rate limit and no-store response

### 7.4 Guard, Audit, and Rate Limit Requirements

All candidate APIs must include:

- fail-closed auth
- role check
- method allowlist
- body validation
- response redaction
- no-store cache header
- rate limit
- audit/operator event design
- trace id
- sanitized error response
- dry-run default
- explicit separation from DB promotion

No route should call:

- Meta Marketing API
- Supabase write/import/migration
- Python retrain
- LLM provider
- legacy upload/cache scripts

## 8. Request/Response Shape

These shapes are design candidates, not implemented contracts.

### 8.1 Dry-run Request

```json
{
  "source_type": "dashboard_export",
  "metadata": {
    "platform": "meta",
    "exported_at": "ISO_DATE_OR_TIMESTAMP",
    "date_range": {
      "start": "YYYY-MM-DD",
      "stop": "YYYY-MM-DD"
    },
    "timezone": "Asia/Seoul",
    "currency": "KRW",
    "net_or_gross": "net",
    "markup_policy": "included",
    "aggregation_level": "daily",
    "breakdown": ["age", "gender"]
  },
  "file_reference_mode": "temporary_upload_or_local_review",
  "dry_run": true
}
```

Rules:

- `dry_run` must be true or default true.
- no execute/import/promotion flag belongs in this endpoint.
- raw file bytes handling must be separately designed before implementation.
- raw file path must not be returned.

### 8.2 Dry-run Response

```json
{
  "report_id": "optional_when_report_storage_is_approved",
  "report_version": 1,
  "trace_id": "TRACE_REFERENCE",
  "side_effects": {
    "db_write": false,
    "meta_api_call": false,
    "llm_call": false,
    "python_retrain": false,
    "raw_file_created": false
  },
  "status_summary": {
    "validation_status": "warning",
    "approval_status": "warning",
    "window_policy": "recent_6_months",
    "privacy_status": "safe_aggregate_only",
    "blocker_count": 0,
    "warning_count": 1
  },
  "report": {
    "file_summary": {},
    "sheet_summary": [],
    "mapping_report": {},
    "accepted_columns": [],
    "rejected_columns": [],
    "missing_required_fields": [],
    "warnings": [],
    "derived_metric_preview": {},
    "privacy_findings": {},
    "reviewer_action_required": [],
    "normalized_preview_sample": []
  }
}
```

Rules:

- response is sanitized.
- `normalized_preview_sample` is empty when `security_failed`.
- report does not include raw campaign rows.
- report does not promote benchmark facts.

### 8.3 Report Detail Response

```json
{
  "report_id": "REPORT_REFERENCE",
  "report_version": 1,
  "created_at": "ISO_TIMESTAMP",
  "created_by_actor": "ACTOR_REFERENCE",
  "source_summary": {
    "source_type": "dashboard_export",
    "source_hash": "HASH_REFERENCE",
    "raw_file_retention_policy": "do_not_store"
  },
  "review_state": {
    "status": "warning",
    "assigned_reviewer": "ACTOR_REFERENCE",
    "decision": null
  },
  "report": {}
}
```

Rules:

- `source_hash` is allowed as lineage reference.
- raw filename/path is not report-ready.
- actor references should follow Agent Core privacy policy.

### 8.4 Review Action Request

```json
{
  "report_version": 1,
  "decision": "approve_with_warning",
  "reason": "Sanitized reviewer rationale.",
  "accepted_warning_codes": ["missing_reach"],
  "correction_required_fields": [],
  "retention_recommendation": "do_not_store",
  "aggregate_only_confirmed": true,
  "long_term_trend_only_confirmed": false
}
```

Decision enum candidates:

```text
approve
approve_with_warning
reject
request_correction
mark_long_term_trend_only
mark_aggregate_only
```

Rules:

- reason is required except simple approve.
- warning decisions require accepted warning codes.
- rejection requires reject reason code.
- correction requires missing/correction fields.
- review action cannot trigger normalized dataset import.

### 8.5 Review Action Response

```json
{
  "report_id": "REPORT_REFERENCE",
  "report_version": 1,
  "review_state": {
    "status": "approved",
    "decision": "approve_with_warning",
    "decided_at": "ISO_TIMESTAMP",
    "decided_by_actor": "ACTOR_REFERENCE"
  },
  "promotion": {
    "normalized_dataset_promotion_allowed": false,
    "requires_next_gate": "Foresight-Benchmark-9"
  }
}
```

Rules:

- response makes promotion boundary explicit.
- no DB row count or import result should exist in this Gate.

### 8.6 Sanitized Error Response

```json
{
  "error_code": "FORBIDDEN_OR_VALIDATION_ERROR",
  "message": "Generic safe message.",
  "trace_id": "TRACE_REFERENCE",
  "retryable": false,
  "reviewer_action": "request_correction"
}
```

Rules:

- no raw exception stack.
- no internal service URL.
- no token/session value.
- no raw file path.
- no raw row sample.

### 8.7 Privacy Finding Shape

```json
{
  "identifier_columns_detected": true,
  "identifier_column_groups": ["account", "campaign"],
  "advertiser_or_brand_columns_detected": false,
  "raw_identifier_in_output_risk": true,
  "secret_like_value_detected": false,
  "url_like_value_detected": false,
  "llm_boundary_status": "safe_only_if_aggregate",
  "recommended_action": "Keep identifiers in raw zone or review-only metadata."
}
```

Rules:

- privacy finding uses categories and booleans.
- it never returns raw identifier values or unsafe URLs.

## 9. Permission Model

### 9.1 Uploader

Can:

- submit candidate upload package
- run or request dry-run
- view own non-sensitive report status
- respond to correction request

Cannot:

- approve own upload
- promote to normalized dataset
- view raw security finding values
- trigger DB import, Meta sync, Python retrain, or LLM call

### 9.2 Reviewer

Can:

- view sanitized report
- make review decision
- approve with warning
- reject or request correction
- mark trend-only or aggregate-only

Cannot:

- bypass `security_failed`
- expose raw identifiers in report-ready output
- trigger normalized dataset promotion directly

### 9.3 Admin / Data Steward

Can:

- assign reviewer
- confirm taxonomy and reach semantics
- decide identifier handling policy
- place security hold
- manage retention exception under policy

Cannot:

- bypass secret redaction
- commit raw files to repo
- implement DB/API automation without separate Gate approval

### 9.4 Ordinary User

Ordinary product users:

- may consume approved aggregate benchmark outputs later.
- cannot access dry-run reports by default.
- cannot promote benchmark data.
- cannot view raw files, reviewer-only metadata, or privacy/security details.

### 9.5 Fail-closed Guard

All candidate API and UI actions should fail closed when:

- actor role is missing.
- report version is stale.
- dry-run status is `security_failed`.
- required reviewer reason is missing.
- route lacks approved audit/rate-limit controls.
- raw data would enter response.
- promotion side effect is requested from review endpoint.

## 10. Data Boundary

### 10.1 Raw File Storage

Default design:

```text
raw_file_storage = not persisted by default
```

Future alternatives require separate approval:

- temporary restricted hold
- restricted source evidence storage
- security hold

Rules:

- raw files never live in repo.
- raw files never live in normalized benchmark table.
- raw path is not returned to UI except restricted local operator view if approved.
- source hash may be used for lineage.

### 10.2 Masked Preview Only

Report UI may show:

- canonical field names
- source column labels after masking
- value type status
- count buckets
- date patterns
- presence flags
- aggregate metric preview

Report UI must not show:

- campaign names
- advertiser names
- account ids
- ad/adset identifiers
- raw URL values
- row-level metrics tied to identifiers

### 10.3 No LLM Raw Data

No reviewer UI/API path should forward:

- raw upload file
- raw campaign-level row
- identifier columns
- raw URLs
- reviewer-only security notes

LLM/report integration, if later approved, receives only aggregate canonical summaries and limitations.

### 10.4 No DB Promotion Until Approved

Review approval means:

```text
candidate may proceed to normalized benchmark schema/promotion planning
```

Review approval does not mean:

```text
insert into DB
run migration
import source file
train model
sync Meta
send to LLM
```

### 10.5 Smoke/Test Exclusion

Mock and smoke outputs:

- validate the harness only.
- are not source evidence.
- cannot be promoted.
- should be labeled non-production in UI.

`inline_mock` source type should be visually marked as test-only.

## 11. Design Director Linkage

Benchmark reviewer UI should be eligible for a Design Director review before implementation.

### 11.1 Prompt Inputs

Design review prompt should include:

- reviewer workflow summary
- dry-run report section list
- status model
- decision CTAs
- privacy boundary
- dense table requirements
- no raw data display constraints
- no marketing-style landing page
- target user: media planner/operator/reviewer

### 11.2 Table Density

Design Director should check:

- mapping table can scan 30 to 100 columns without visual noise.
- status badges do not stretch rows.
- confidence/severity filters are reachable.
- column labels with long names wrap or truncate professionally.
- masked labels remain understandable.

### 11.3 Status Badge Criteria

Status badges should be:

- compact
- color plus text, not color-only
- consistent across summary, table, and decision area
- ordered by severity: security, failed, warning, validated, approved

### 11.4 Confidence and Basis UI

Design should expose:

- mapping confidence
- metric calculability
- currency basis
- Net/Gross basis
- recent vs long-term basis
- aggregate-only basis

Basis labels should sit near the metric or decision they constrain, not only in a footer.

### 11.5 Report UI Review Prompt Candidate

```text
Review the Foresight benchmark reviewer report UI for operator efficiency and safety.
Focus on dense mapping tables, status hierarchy, reviewer decision clarity,
privacy boundary visibility, metric basis labels, and whether a reviewer can
make approve/reject/correction decisions without seeing raw campaign data.
Reject designs that hide blockers, overuse cards, resemble a landing page,
or make raw identifiers appear report-ready.
```

## 12. Open Questions

1. Should dry-run reports be persisted before normalized schema exists?
2. Should upload/dry-run remain local-only through MVP, or be exposed as guarded internal API?
3. What is the maximum file size and parser timeout for future API dry-run?
4. Which auth provider or Agent Core role model owns uploader/reviewer/admin roles?
5. Should reviewer decisions be immutable per report version?
6. What fields may uploader see when security findings exist?
7. Which warning types can be approved with warning vs must require correction?
8. Should Design Director review happen before or after API contract implementation?

## 13. Follow-up Gates

### Foresight-Benchmark-9: Normalized Benchmark Schema Proposal

Scope candidate:

- propose normalized aggregate schema
- define grain, required metadata, source hash, approval status
- define identifier hash/count policy
- still no migration/import until approved

### Foresight-Benchmark-10: Dry-run API Implementation Plan

Scope candidate:

- implementation plan for guarded dry-run API
- file size, parser timeout, auth, audit, rate limit, no-store response
- no implementation until approved

### Design-Director Foresight Report UI Review Refinement

Scope candidate:

- refine reviewer report UI prompt
- produce design acceptance checklist
- confirm table density, status hierarchy, basis labels, and privacy boundary

## 14. Final Recommendation

Benchmark-8 recommends the following UI/API design stance:

```text
1. Make status, blockers, privacy, and next action visible in the first viewport.
2. Treat mapping and preview as sanitized evidence, not raw data display.
3. Keep reviewer decisions explicit, reasoned, versioned, and audited.
4. Require guard, audit, rate limit, and redaction before any API implementation.
5. Keep normalized benchmark promotion as a separate approved Gate.
```
