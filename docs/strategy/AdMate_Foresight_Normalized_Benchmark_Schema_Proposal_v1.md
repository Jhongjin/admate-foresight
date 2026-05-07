# AdMate Foresight Normalized Benchmark Schema Proposal v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-9 normalized benchmark schema proposal

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark dry-run과 reviewer approval 이후, 승인된 benchmark 후보를 어떤 normalized benchmark schema 후보로 저장할지 제안한다.

이번 Gate는 schema proposal만 수행한다. DB migration, schema 파일 작성, API route 구현, 코드 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain, LLM 호출은 수행하지 않는다.

핵심 원칙:

```text
Raw upload is source evidence.
Dry-run report is sanitized review evidence.
Reviewer approval is a gate, not an import.
Approved normalized benchmark dataset is the benchmark source of truth.
Only reviewer-approved aggregate/canonical rows may be promoted.
```

## 2. Schema Purpose

### 2.1 Approved Normalized Benchmark Dataset

Normalized benchmark schema의 목적은 Foresight MVP와 이후 Data Core 통합에서 사용할 approved benchmark fact를 안정적으로 보존하는 것이다.

Schema should support:

- deterministic metric validation lineage
- reviewer-approved canonical fields
- recent 6-month benchmark vs long-term trend separation
- currency and Net/Gross basis preservation
- aggregate-only report and LLM boundary
- dataset versioning and rollback
- audit/operator event linkage

### 2.2 Separation from Raw Upload

Raw upload is not the source of truth. Raw Excel/CSV/API-like export may be temporary source evidence only.

Separation rule:

| Zone | Contents | Storage decision | LLM/report eligibility |
| --- | --- | --- | --- |
| raw upload zone | original file, raw campaign rows, raw identifiers | default do not store; restricted retention only if approved | never |
| dry-run report zone | sanitized mapping, warnings, privacy findings, preview patterns | may be stored after report storage decision | reviewer/admin only |
| review event zone | decision, actor, reason, accepted warnings | should be auditable | limited sanitized summary |
| normalized benchmark zone | approved aggregate/canonical benchmark rows | source of truth candidate | aggregate/report-safe only |
| dataset version zone | active/deprecated dataset version metadata | source of version truth | safe metadata only |

### 2.3 Reviewer-approved Aggregate Rows Only

`normalized_benchmark_rows` should contain only rows that are:

- approved or explicitly approved with warning
- canonicalized
- aggregate or approved cohort-level
- stripped of raw campaign/account/ad identifiers
- tied to source fingerprint and review decision
- classified into recent or long-term benchmark window

It must not contain raw campaign-level rows unless a later Gate explicitly defines an aggregate grain that is still report-safe and identifier-free.

### 2.4 LLM/Report-ready Boundary

LLM/report-ready payloads may use:

- platform
- objective and optimization_goal canonical values
- date window
- benchmark metric aggregates
- sample size and confidence bucket
- currency and Net/Gross basis
- warning/limitation labels
- dataset version

LLM/report-ready payloads must not use:

- raw upload file
- raw row values tied to campaign hierarchy
- campaign name
- account id/name
- advertiser or brand name
- ad/adset identifiers
- credential-bearing URL or request metadata
- reviewer-only notes containing sensitive context

## 3. Candidate Table Set

The following table names are proposal candidates only. This document does not create schemas or migrations.

```text
foresight.benchmark_uploads
foresight.benchmark_dry_run_reports
foresight.benchmark_review_events
foresight.normalized_benchmark_rows
foresight.benchmark_dataset_versions
```

The `foresight` schema name is also a proposal. Final schema placement should be decided with AdMate Data Core.

## 4. Table Candidate: `foresight.benchmark_uploads`

### 4.1 Purpose

Track sanitized upload intake metadata and raw retention policy. This table should not store raw file bytes or raw row dumps.

### 4.2 Candidate Fields

| Field | Type candidate | Purpose | Privacy note |
| --- | --- | --- | --- |
| `upload_id` | uuid | upload reference | safe identifier |
| `source_type` | text enum | `dashboard_export`, `meta_api_export` | no raw provider response |
| `platform` | text enum | e.g. `meta` | canonical |
| `source_fingerprint` | text/hash | source file/content hash | no raw path |
| `source_name_masked` | text nullable | optional human label after masking | avoid raw advertiser/campaign name |
| `file_type` | text enum | csv/xlsx/xls/inline_mock/future | no raw file |
| `file_size_bucket` | text | size bucket | no exact path |
| `raw_file_retention_policy` | text enum | do_not_store, temporary_restricted_hold, restricted_source_evidence, security_hold | policy-owned |
| `raw_file_storage_ref` | restricted nullable | only if retention approved | never report-ready |
| `uploaded_by` | actor reference | uploader | sanitized actor ref |
| `uploaded_at` | timestamp | lineage | safe |
| `upload_metadata` | jsonb candidate | approved metadata subset | no secrets/raw ids |
| `status` | text enum | draft, dry_run_completed, review_requested, rejected, approved_for_normalization | not DB promotion |
| `created_at` | timestamp | system | safe |
| `updated_at` | timestamp | system | safe |

### 4.3 Non-fields

Do not store:

- raw file content
- raw campaign rows
- token/session URLs
- raw account/campaign/ad identifiers
- provider raw API response
- local filesystem path in report-visible fields

## 5. Table Candidate: `foresight.benchmark_dry_run_reports`

### 5.1 Purpose

Persist sanitized dry-run report evidence if report storage is approved. This table is optional until report retention policy is decided.

### 5.2 Candidate Fields

| Field | Type candidate | Purpose | Privacy note |
| --- | --- | --- | --- |
| `report_id` | uuid | report reference | safe |
| `upload_id` | uuid | upload lineage | safe |
| `report_version` | integer | immutable report version | supports re-run |
| `schema_mapping_version` | text | mapper version | safe |
| `parser_profile` | text | parser profile | safe |
| `validation_status` | text enum | passed/warning/failed/security_failed | safe |
| `approval_status` | text enum | validated/warning/rejected/security_review_required | safe |
| `window_policy` | text enum | recent_6_months, long_term_trend, mixed_window, date_unparseable | safe |
| `excluded_from_default_benchmark` | boolean | default eligibility | safe |
| `blocker_count` | integer | summary | safe |
| `warning_count` | integer | summary | safe |
| `missing_required_fields` | jsonb | field names/remediation only | no raw rows |
| `warnings` | jsonb | warning codes and counts | no raw examples |
| `mapping_summary` | jsonb | confidence counts/canonical status | no raw unsafe labels |
| `accepted_columns` | jsonb | masked/approved labels | no identifiers |
| `rejected_columns` | jsonb | masked labels/reason codes | no secrets |
| `derived_metric_preview` | jsonb | aggregate preview/status | no row-level campaign facts |
| `privacy_findings` | jsonb | categories/booleans | no raw identifiers |
| `normalized_preview_sample` | jsonb | pattern rows only | hidden if security_failed |
| `side_effects` | jsonb | all false in dry-run | proof boundary |
| `generated_by` | actor reference | system/internal actor | safe |
| `generated_at` | timestamp | lineage | safe |

### 5.3 Report Storage Rule

If `validation_status = security_failed`, the stored report should include categories and blocker status only. It should not store unsafe values, raw URLs, or raw source excerpts.

## 6. Table Candidate: `foresight.benchmark_review_events`

### 6.1 Purpose

Record reviewer/operator decisions and audit-friendly workflow events. This table should be append-only or versioned.

### 6.2 Candidate Fields

| Field | Type candidate | Purpose | Privacy note |
| --- | --- | --- | --- |
| `event_id` | uuid | event reference | safe |
| `upload_id` | uuid nullable | upload linkage | safe |
| `report_id` | uuid nullable | report linkage | safe |
| `dataset_version_id` | uuid nullable | dataset linkage | safe |
| `event_type` | text enum | submitted/dry_run_completed/approved/rejected/etc. | safe |
| `actor_id` | actor reference | who performed action | sanitized |
| `actor_role` | text enum | uploader/reviewer/admin/data_steward/internal | safe |
| `event_at` | timestamp | audit time | safe |
| `decision` | text enum nullable | approve, approve_with_warning, reject, request_correction, trend_only, aggregate_only | safe |
| `reason_code` | text nullable | structured reason | no raw details |
| `reason_text_sanitized` | text nullable | reviewer rationale | no raw rows/secrets |
| `accepted_warning_codes` | text[]/jsonb | warnings accepted | safe |
| `correction_required_fields` | text[]/jsonb | field names only | safe |
| `trace_id` | text | operator trace | safe |
| `input_fingerprint` | text nullable | source/report fingerprint | safe |
| `audit_payload` | jsonb | counts/status only | no secrets/raw rows |

### 6.3 Event Types

Candidate event types:

- `benchmark_upload_submitted`
- `benchmark_dry_run_completed`
- `benchmark_review_requested`
- `benchmark_approved`
- `benchmark_rejected`
- `benchmark_correction_requested`
- `benchmark_promoted_to_normalized_dataset`
- `benchmark_dataset_version_activated`
- `benchmark_dataset_version_deprecated`
- `benchmark_raw_file_retention_expired`
- `benchmark_security_review_requested`

## 7. Table Candidate: `foresight.normalized_benchmark_rows`

### 7.1 Purpose

Store approved normalized benchmark facts that can feed Foresight planning, prediction comparison, reporting, and eventual Data Core integration.

### 7.2 Grain Candidate

Initial row grain should be aggregate/canonical, not raw campaign-level.

Candidate grain dimensions:

```text
platform
source_type
date_start/date_stop
period_granularity
objective
optimization_goal
currency
net_or_gross
breakdown fields
benchmark_window
dataset_version_id
```

The exact grain must be finalized before migration. Mixed grain data should be split before promotion.

### 7.3 Required Normalized Row Fields

| Field | Type candidate | Required | Purpose |
| --- | --- | --- | --- |
| `benchmark_row_id` | uuid | Yes | row reference |
| `dataset_version_id` | uuid | Yes | version linkage |
| `source_upload_id` | uuid | Yes | lineage |
| `source_report_id` | uuid | Yes | dry-run lineage |
| `source_fingerprint` | text/hash | Yes | source lineage without raw path |
| `platform` | text enum | Yes | e.g. meta |
| `source_type` | text enum | Yes | dashboard_export or meta_api_export |
| `date_start` | date | Yes | reporting window start |
| `date_stop` | date | Yes | reporting window end |
| `period_granularity` | text enum | Yes | daily, weekly, monthly, campaign_total, mixed_not_allowed |
| `objective` | text | Yes | canonical objective |
| `optimization_goal` | text | Yes | canonical optimization goal |
| `currency` | text enum | Yes | explicit currency |
| `net_or_gross` | text enum | Yes | net, gross, unknown_not_approved |
| `markup_policy` | text enum | Yes | included, excluded, manual_rate, unknown_not_approved |
| `impressions` | numeric | Yes | aggregate impressions |
| `clicks` | numeric | Yes | aggregate clicks |
| `reach` | numeric nullable | Recommended | aggregate reach when confirmed |
| `spend` | numeric | Yes | aggregate spend in source currency/basis |
| `cpm` | numeric nullable | Yes when calculable | spend / impressions * 1000 |
| `cpc` | numeric nullable | Yes when calculable | spend / clicks |
| `ctr` | numeric nullable | Yes when calculable | clicks / impressions |
| `frequency` | numeric nullable | Optional | impressions / reach |
| `sample_size` | integer | Yes | rows/cohort samples represented |
| `confidence_bucket` | text enum | Yes | high, medium, low, review_required |
| `benchmark_window` | text enum | Yes | recent_6m or long_term |
| `reviewer_status` | text enum | Yes | approved, approved_with_warning, trend_only, aggregate_only |
| `created_by` | actor reference | Yes | internal/system actor |
| `reviewed_by` | actor reference | Yes | reviewer actor |
| `created_at` | timestamp | Yes | system time |
| `reviewed_at` | timestamp | Yes | reviewer decision time |

### 7.4 Breakdown Fields

Breakdown fields should be optional and explicitly scoped:

| Field | Type candidate | Notes |
| --- | --- | --- |
| `industry` | text nullable | approved taxonomy only; do not parse raw campaign name by default |
| `age_range` | text nullable | optional breakdown |
| `gender` | text nullable | optional breakdown |
| `device` | text nullable | optional breakdown |
| `placement` | text nullable | optional breakdown |
| `creative_format` | text nullable | optional breakdown |
| `region` | text nullable | optional future dimension |
| `breakdown_signature` | text/hash | stable summary of active breakdown dimensions |
| `aggregation_level` | text enum | daily/weekly/monthly/cohort |

Mixed breakdown rows should not be promoted unless split or explicitly marked as non-default.

### 7.5 Metric Rules

Deterministic metric definitions:

| Metric | Formula | Zero division rule |
| --- | --- | --- |
| `cpm` | `spend / impressions * 1000` | null if impressions <= 0 |
| `cpc` | `spend / clicks` | null if clicks <= 0 |
| `ctr` | `clicks / impressions` | null if impressions <= 0 |
| `frequency` | `impressions / reach` | null if reach missing or <= 0 |

Rules:

- never substitute UI fallback defaults.
- preserve null and limitation status.
- do not ask LLM to calculate metrics.
- store currency and Net/Gross basis with every row.
- store warning/limitation references when approved with warning.

### 7.6 Review and Limitation Fields

Candidate fields:

| Field | Type candidate | Purpose |
| --- | --- | --- |
| `warning_codes` | text[]/jsonb | accepted warnings |
| `limitation_notes_sanitized` | text/jsonb | reviewer-approved limitation text |
| `metric_status` | jsonb | calculable/blocked status per metric |
| `privacy_boundary_status` | text enum | aggregate-only status |
| `identifier_policy` | text enum | none_detected, raw_zone_only, review_only_hash, aggregate_only |
| `llm_eligible` | boolean | true only for aggregate/report-safe row |
| `report_eligible` | boolean | true only for planner/report-safe row |

### 7.7 Raw Identifier Non-fields

Do not include:

- raw account id
- raw account name
- raw campaign id
- raw campaign name
- raw adset/ad id or name
- raw advertiser/brand/client name
- browser session URL
- token/key/credential values
- row-level raw file line reference visible to ordinary users

Identifier lineage, if approved, should use hash/count/reference in a restricted table or metadata field, not raw names.

## 8. Table Candidate: `foresight.benchmark_dataset_versions`

### 8.1 Purpose

Track normalized benchmark dataset releases, activation, deprecation, and rollback.

### 8.2 Candidate Fields

| Field | Type candidate | Purpose |
| --- | --- | --- |
| `dataset_version_id` | uuid | version reference |
| `version_label` | text | human-readable version |
| `status` | text enum | draft, active, deprecated, revoked |
| `benchmark_window_start` | date | recent window start |
| `benchmark_window_end` | date | recent window end |
| `contains_long_term_rows` | boolean | trend rows included |
| `row_count` | integer | normalized row count |
| `source_upload_count` | integer | source count |
| `approved_by` | actor reference | approving actor |
| `activated_by` | actor reference | activation actor |
| `activated_at` | timestamp nullable | activation time |
| `deprecated_at` | timestamp nullable | deprecation time |
| `deprecation_reason` | text nullable | sanitized reason |
| `created_at` | timestamp | system time |
| `notes_sanitized` | text/jsonb | no raw source detail |

### 8.3 Versioning Rules

- only one active default dataset should exist per benchmark scope unless multi-version serving is explicitly designed.
- long-term trend rows should be versioned separately or explicitly flagged.
- activation should be auditable.
- deprecation should not delete historical rows by default.
- rollback should activate prior approved version, not reconstruct from raw upload.

## 9. Raw Data Boundary

### 9.1 Raw File Retention Options

Candidate policies:

| Policy | Meaning | Schema implication |
| --- | --- | --- |
| `do_not_store` | discard raw file after dry-run/review | only source hash and metadata remain |
| `temporary_restricted_hold` | retain temporarily for correction/security | restricted storage ref and expiry required |
| `restricted_source_evidence` | retain for lineage/evidence | admin/data steward approval required |
| `security_hold` | retain for investigation | security owner and access log required |

No policy allows committing raw files to repo.

### 9.2 Raw Campaign/Account/Ad Identifiers

Identifier handling:

- raw identifiers remain in raw zone only if retention is approved.
- normalized rows may include aggregate counts or approved hash references only.
- report/LLM payload must not include raw identifiers.
- advertiser/brand/client names should be mapped to approved taxonomy before any benchmark use.

### 9.3 Masking and Fingerprint

Candidate fingerprint fields:

| Field | Purpose |
| --- | --- |
| `source_fingerprint` | source file/content lineage without raw path |
| `input_fingerprint` | dry-run input payload lineage |
| `breakdown_signature` | aggregate grain identity |
| `account_scope_hash` | optional restricted hash, if approved |
| `identifier_group_counts` | count of identifier groups detected |

Hash salt and scope should be owned by Agent Core/Data Core policy, not this repo alone.

### 9.4 Aggregate-only Promotion

Aggregate-only promotion means:

- no raw campaign row is stored in normalized rows.
- metrics are aggregated to approved grain.
- identifiers are removed, hashed, or counted according to policy.
- privacy boundary status is stored.
- LLM/report-ready eligibility is explicit.

### 9.5 No Raw Campaign Data to LLM

Even after normalization, LLM may receive only:

- aggregate row summaries
- metric percentiles or medians if later computed
- date window
- sample size
- warning/limitation labels
- currency and cost basis

LLM must never receive raw campaign-level input.

## 10. RLS and Permission Candidates

These are policy candidates only. No RLS policies are created in this Gate.

### 10.1 Role: Uploader

Candidate permissions:

- insert upload metadata for own upload
- view own upload status
- view non-sensitive correction reasons
- cannot view full dry-run privacy findings if security sensitive
- cannot approve or promote
- cannot read normalized row internals unless separately allowed

### 10.2 Role: Reviewer

Candidate permissions:

- read assigned sanitized dry-run reports
- create review events
- approve, reject, request correction
- mark trend-only or aggregate-only
- read normalized rows in reviewer scope
- cannot bypass security_failed
- cannot write normalized benchmark rows directly

### 10.3 Role: Admin / Data Steward

Candidate permissions:

- assign reviewers
- manage taxonomy decisions
- approve retention exception
- activate/deprecate dataset versions
- review RLS exceptions
- cannot expose raw identifiers or secrets in ordinary UI

### 10.4 Ordinary User

Candidate permissions:

- read only active, report-safe aggregate benchmark outputs
- no access to upload records by default
- no access to dry-run reports by default
- no access to review events by default
- no access to raw file references or identifier policy internals

### 10.5 Service Role / Internal Actor Boundary

Internal actor may:

- run dry-run/report generation
- write audit events
- promote approved normalized rows in a future controlled import process

Internal actor must:

- use explicit operation type
- include trace id
- fail closed without authority
- not expose service credentials
- not combine review approval with import unless a later Gate approves that operation

## 11. Audit/Operator Event Mapping

| Workflow event | Candidate table | Notes |
| --- | --- | --- |
| upload submitted | `benchmark_uploads`, `benchmark_review_events` | upload metadata and submitted event |
| dry run completed | `benchmark_dry_run_reports`, `benchmark_review_events` | sanitized report and event |
| review requested | `benchmark_review_events` | assignment/routing event |
| approved | `benchmark_review_events` | decision with accepted warnings |
| rejected | `benchmark_review_events` | reason code only |
| correction requested | `benchmark_review_events` | correction fields only |
| promoted to normalized dataset | `normalized_benchmark_rows`, `benchmark_review_events` | future controlled promotion |
| dataset version activated | `benchmark_dataset_versions`, `benchmark_review_events` | version event |
| dataset version deprecated | `benchmark_dataset_versions`, `benchmark_review_events` | rollback/deprecation event |

Audit payload must never include:

- raw file
- raw campaign rows
- token/session values
- raw URLs
- raw identifiers
- provider raw response

## 12. Migration Readiness Blockers

No migration should be written until these blockers are resolved.

### 12.1 AdMate Data Core Target Schema Decision

Open decisions:

- should normalized benchmark live in Foresight-owned schema or Data Core-owned schema?
- should Data Core own dataset versioning?
- how should Agent Core audit actor references be modeled?
- how should taxonomy references be shared across Compass/Sentinel/Foresight?

### 12.2 Backup and Export Plan

Before migration:

- define non-production backup process.
- define rollback and export format.
- define version deprecation behavior.
- define whether dry-run reports are persisted.

### 12.3 Non-production Dry Run

Before production:

- test schema in non-production.
- run synthetic/sanitized dry-run promotion only.
- verify no raw artifacts enter DB.
- verify RLS denies ordinary users.
- verify report-safe query shape.

### 12.4 RLS Policy Review

Before migration:

- define uploader/reviewer/admin/data steward roles.
- test self-approval prevention.
- test service role boundaries.
- verify raw retention refs are restricted.
- verify ordinary users see only active aggregate rows.

### 12.5 Data Retention Policy

Before migration:

- decide raw file retention default.
- decide report retention period.
- decide rejected upload retention.
- decide security hold path.
- decide source hash retention.

### 12.6 Reviewer Role Source

Before migration:

- define role source of truth.
- decide whether roles come from Agent Core, auth provider, or local policy.
- define actor reference format.
- define audit event ownership.

## 13. Open Questions

1. Should dry-run reports be persisted or regenerated on demand until Data Core is ready?
2. Should `foresight.normalized_benchmark_rows` be a physical table, materialized view, or Data Core managed dataset?
3. What is the first approved aggregation grain for MVP?
4. Is `industry` required for benchmark rows, and who owns its taxonomy?
5. Should long-term trend rows live in the same table with `benchmark_window`, or a separate trend table?
6. What thresholds define `confidence_bucket`?
7. What is the approved hash policy for source and identifier fingerprints?
8. Which fields are report-safe for ordinary users?

## 14. Follow-up Gates

### Foresight-Benchmark-10: Schema Draft Review

Scope candidate:

- review this proposal with Data Core, Security, and product owners
- finalize table ownership and field list
- still no migration

### Foresight-Benchmark-11: Nonprod Dry-run Migration Plan

Scope candidate:

- plan non-production migration only
- define rollback, backup, RLS test, and seed policy
- synthetic/sanitized test data only

### Foresight-Benchmark-12: Dry-run API Implementation Plan

Scope candidate:

- plan guarded dry-run API route implementation
- auth, audit, rate limit, no-store response, request size limit
- no raw persistence or promotion side effects by default

## 15. Final Recommendation

Benchmark-9 recommends this normalized schema direction:

```text
1. Keep raw uploads and normalized benchmark rows strictly separate.
2. Persist only sanitized dry-run/report/review evidence if retention is approved.
3. Store approved benchmark facts as aggregate canonical rows with source/review lineage.
4. Preserve currency, Net/Gross, window policy, sample size, confidence, and limitation metadata.
5. Delay DB migration until Data Core ownership, RLS, retention, backup, and reviewer role source are resolved.
```
