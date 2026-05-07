# AdMate Foresight Benchmark Schema Draft Readiness Review v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-10 schema draft readiness review

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Gate Foresight-Benchmark-9의 normalized benchmark schema proposal을 실제 SQL draft로 옮기기 전에, table, field, RLS, audit, retention 설계가 충분한지 검토한다.

이번 Gate는 readiness review만 수행한다. SQL migration 파일 작성, DB/schema/migration 적용, 코드/API 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain, LLM 호출은 수행하지 않는다.

핵심 판정:

```text
The schema direction is ready for SQL draft preparation.
The schema is not ready for migration or DB application.
RLS, retention, Data Core ownership, rollback, and role source remain blockers.
```

## 2. Review Basis

Reviewed inputs:

- `AdMate_Foresight_Normalized_Benchmark_Schema_Proposal_v1.md`
- `AdMate_Foresight_Benchmark_Reviewer_Report_UI_API_Design_v1.md`
- `AdMate_Foresight_Benchmark_Reviewer_Workflow_v1.md`
- `AdMate_Foresight_Benchmark_Dry_Run_Harness_Design_v1.md`
- `AdMate_Foresight_Benchmark_Column_Mapping_Spec_v1.md`
- `AdMate_Foresight_Benchmark_Upload_Validation_Spec_v1.md`
- `lib/benchmark/dryRunHarness.mts`
- `scripts/benchmark-dry-run.mjs`

Review posture:

- assess whether the proposed schema can be translated into a SQL draft.
- identify what must stay nullable, restricted, or out of schema for now.
- keep raw upload, dry-run report, review event, normalized benchmark row, and dataset version responsibilities separate.
- preserve the existing no-side-effect boundary of the dry-run harness.

## 3. Readiness Legend

| Status | Meaning |
| --- | --- |
| Ready for SQL draft | Field/table can be represented in a draft DDL proposal without applying it. |
| Conditional | Field/table can be drafted, but migration must wait for owner/policy decision. |
| Hold | Do not include as active schema behavior until a later Gate resolves the blocker. |
| Exclude | Should not be stored in this schema or should remain raw/restricted only. |

## 4. Table Readiness Review

### 4.1 `foresight.benchmark_uploads`

Purpose:

- store sanitized upload intake metadata.
- link source evidence to dry-run reports and review events.
- record source fingerprint and raw retention policy without storing raw rows.

Readiness:

| Area | Review |
| --- | --- |
| SQL draft readiness | Ready for SQL draft as metadata table. |
| Migration readiness | Conditional on Data Core schema ownership and retention policy. |
| Primary key | `upload_id` is ready as uuid candidate. |
| Required fields | `source_type`, `platform`, `source_fingerprint`, `file_type`, `raw_file_retention_policy`, `uploaded_by`, `uploaded_at`, `status`, timestamps. |
| Nullable candidates | `source_name_masked`, `file_size_bucket`, `raw_file_storage_ref`, `upload_metadata`, `reviewer` until assignment. |
| Retention | Must default to `do_not_store`; restricted storage ref must be nullable and access-controlled. |
| Risk | Raw file refs can become a leakage surface if exposed to ordinary users or logs. |

Required column sufficiency:

- `upload_id`, `source_type`, `platform`, `source_fingerprint`, and `uploaded_by` are sufficient for sanitized lineage.
- `raw_file_retention_policy` is necessary before any raw file retention reference exists.
- `status` is necessary but needs seeded enum or check constraint decision.

Nullable guidance:

- `raw_file_storage_ref` must remain nullable and restricted.
- `source_name_masked` should remain nullable because names may include advertiser/campaign context.
- `upload_metadata` should remain sanitized JSON only until a stricter typed metadata table is justified.

Retention review:

- upload metadata can be retained for audit lineage.
- raw file storage is not approved by this Gate.
- rejected/security-failed uploads need a retention expiry policy before migration.

Risk classification:

- P1 privacy risk if raw source path, filename, advertiser name, campaign name, or account id enters this table.
- P1 authorization risk if uploader can read restricted retention refs.
- P2 data quality risk if `platform` defaults silently to Meta instead of being explicit.

Readiness decision:

```text
Ready for SQL draft.
Not ready for migration until retention and RLS are finalized.
```

### 4.2 `foresight.benchmark_dry_run_reports`

Purpose:

- store sanitized dry-run report evidence.
- preserve mapping, warnings, blockers, privacy findings, and side-effect proof.
- allow reviewer UI/API to fetch report status without raw row exposure.

Readiness:

| Area | Review |
| --- | --- |
| SQL draft readiness | Ready as optional sanitized report table. |
| Migration readiness | Conditional on report retention decision. |
| Primary key | `report_id` ready as uuid candidate. |
| Required fields | `upload_id`, `report_version`, `schema_mapping_version`, `validation_status`, `blocker_count`, `warning_count`, `generated_by`, `generated_at`. |
| Nullable candidates | `normalized_preview_sample`, `accepted_columns`, `rejected_columns`, `derived_metric_preview`, `privacy_findings` details if `security_failed`. |
| Retention | Report retention should be shorter than normalized benchmark facts unless policy says otherwise. |
| Risk | JSON fields can accidentally store raw rows or unsafe excerpts if serializer is not redaction-first. |

Required column sufficiency:

- `report_version` is necessary because reviewer decisions should bind to a specific report version.
- `validation_status`, `approval_status`, and `window_policy` are sufficient for UI status and workflow routing.
- `side_effects` should be stored or derivable to prove dry-run did not write/call/train.

Nullable guidance:

- `normalized_preview_sample` must be empty/null on `security_failed`.
- `accepted_columns` and `rejected_columns` can be JSON in the first draft, but later may need typed child tables if querying by column becomes important.
- `privacy_findings` should store categories, booleans, and counts only.

Retention review:

- pass/warning reports may be retained as reviewer evidence.
- failed reports may be retained for correction workflow.
- security-failed reports should retain category/status only unless Security approves restricted evidence.

Risk classification:

- P0 if token/provider response/raw URL values are stored in report JSON.
- P1 if raw campaign-level rows or identifier values appear in preview.
- P2 if reports are not versioned and reviewer decisions become ambiguous.

Readiness decision:

```text
Ready for SQL draft with strict sanitized JSON constraints.
Hold migration until serializer/redaction tests and retention period are defined.
```

### 4.3 `foresight.benchmark_review_events`

Purpose:

- record workflow and operator decisions.
- preserve audit trail from upload submission through approval, rejection, correction, and later promotion.
- link human decision, report version, source fingerprint, and trace id.

Readiness:

| Area | Review |
| --- | --- |
| SQL draft readiness | Ready as append-oriented audit table candidate. |
| Migration readiness | Conditional on Agent Core/Data Core audit ownership. |
| Primary key | `event_id` ready as uuid candidate. |
| Required fields | `event_type`, `actor_id`, `actor_role`, `event_at`, `trace_id`. |
| Nullable candidates | `upload_id`, `report_id`, `dataset_version_id`, `decision`, `reason_code`, `reason_text_sanitized`, `input_fingerprint`. |
| Retention | Longer retention likely required than dry-run report JSON. |
| Risk | Free-text reviewer notes can leak raw names or sensitive context. |

Required column sufficiency:

- `event_type`, `actor_id`, `actor_role`, and `trace_id` are sufficient for audit routing.
- `upload_id`, `report_id`, and `dataset_version_id` allow one event table to connect the whole lifecycle.
- `reason_code` should be preferred over free text for decision analytics.

Nullable guidance:

- `decision` nullable for non-decision events such as upload submitted or dry-run completed.
- `dataset_version_id` nullable until normalized promotion/version events exist.
- `reason_text_sanitized` nullable and optional because reason codes should be enough for many events.

Retention review:

- review events should be retained as audit records.
- correction and rejection events should be retained without raw samples.
- self-approval prevention depends on actor linkage being reliable.

Risk classification:

- P1 if reviewer notes include raw campaign/account/advertiser names.
- P1 if actor model allows uploader self-approval.
- P2 if events are mutable without append-only/version policy.

Readiness decision:

```text
Ready for SQL draft as audit candidate.
Migration should wait for Agent Core audit stream and actor reference policy.
```

### 4.4 `foresight.normalized_benchmark_rows`

Purpose:

- store reviewer-approved aggregate/canonical benchmark facts.
- serve Foresight planning, comparison, and report-ready benchmark outputs.
- keep raw upload and raw identifiers out of normalized benchmark facts.

Readiness:

| Area | Review |
| --- | --- |
| SQL draft readiness | Conditional but draftable as proposed aggregate fact table. |
| Migration readiness | Hold until grain, RLS, enum, retention, and Data Core ownership are decided. |
| Primary key | `benchmark_row_id` ready as uuid candidate. |
| Required fields | dataset/source lineage, platform, source_type, dates, objective, optimization_goal, currency, net_or_gross, impressions, clicks, spend, sample_size, benchmark_window, reviewer_status. |
| Nullable candidates | `reach`, `frequency`, derived metrics when denominator invalid, optional breakdown fields, limitation notes. |
| Retention | Normalized rows should follow dataset version lifecycle, not upload retention. |
| Risk | Overly broad grain can recreate campaign-level records or mix incompatible cohorts. |

Required column sufficiency:

- `dataset_version_id`, `source_upload_id`, `source_report_id`, and `source_fingerprint` are sufficient for lineage.
- `date_start`, `date_stop`, and `period_granularity` are sufficient to separate recent vs long-term windows if window classification is stored.
- `currency`, `net_or_gross`, and `markup_policy` are necessary for commercial interpretation.
- `sample_size`, `confidence_bucket`, and warning/limitation fields are necessary to avoid overclaiming benchmark quality.

Nullable guidance:

- `reach` can be nullable because current validation treats missing reach as warning with frequency unavailable.
- `frequency` can be nullable when reach is missing, zero, or unconfirmed.
- `cpm`, `cpc`, and `ctr` should be nullable if deterministic denominator rules block calculation.
- breakdown fields should be nullable and controlled by `breakdown_signature`.

Retention review:

- active/deprecated dataset version should decide serving behavior.
- deleting a dataset version should not be the default rollback mechanism.
- long-term trend rows must be flagged or versioned separately from recent 6-month default rows.

Risk classification:

- P1 if raw campaign/account/ad identifiers are added as dimensions.
- P1 if mixed currency or unknown Net/Gross rows become default benchmark rows.
- P1 if long-term data is mixed into recent benchmark without `benchmark_window`.
- P2 if confidence thresholds are not defined before production use.

Readiness decision:

```text
Ready for SQL draft skeleton.
Hold migration until aggregate grain, Data Core owner, RLS, enum seeds, and rollback are decided.
```

### 4.5 `foresight.benchmark_dataset_versions`

Purpose:

- track normalized benchmark dataset releases.
- support active/deprecated/revoked version lifecycle.
- give rollback a version-level mechanism rather than reconstructing from raw files.

Readiness:

| Area | Review |
| --- | --- |
| SQL draft readiness | Ready for SQL draft as version metadata table. |
| Migration readiness | Conditional on dataset activation ownership and scope rules. |
| Primary key | `dataset_version_id` ready as uuid candidate. |
| Required fields | `version_label`, `status`, window start/stop, row_count, source_upload_count, created_at. |
| Nullable candidates | `activated_by`, `activated_at`, `deprecated_at`, `deprecation_reason`, `notes_sanitized`. |
| Retention | Version metadata should be retained even after deprecation. |
| Risk | Multiple active datasets may conflict if scope/unique constraints are not defined. |

Required column sufficiency:

- `status`, `benchmark_window_start`, and `benchmark_window_end` are sufficient for basic active version selection.
- `row_count` and `source_upload_count` are sufficient for sanity checks.
- `contains_long_term_rows` is needed if recent and long-term rows share the same fact table.

Nullable guidance:

- activation fields should be nullable while a version is draft.
- deprecation fields should be nullable while active/draft.
- notes must remain sanitized and should not replace structured reason codes.

Retention review:

- version records should not be deleted by normal rollback.
- revoked versions need a reason and audit event.
- active status may require a partial unique constraint by dataset scope in SQL draft.

Risk classification:

- P1 if activation lacks audit actor.
- P1 if rollback can activate unreviewed rows.
- P2 if version scope is underspecified and creates ambiguous default benchmark selection.

Readiness decision:

```text
Ready for SQL draft.
Need version scope and one-active-default rule before migration.
```

## 5. Field Sufficiency Review

### 5.1 Platform, Objective, and Optimization Goal

Current sufficiency:

- `platform` is required in upload validation, mapper, and normalized row proposal.
- `objective` and `optimization_goal` are required for validation and normalized row eligibility.
- canonical mapping is documented, but official taxonomy ownership is still open.

Ready for SQL draft:

- include canonical `platform`, `objective`, and `optimization_goal` fields.
- include mapping/version references, either through `schema_mapping_version` in reports or lineage fields.
- include raw value only in restricted staging/report metadata if sanitized; do not include raw campaign-derived labels in normalized rows.

Hold before migration:

- official canonical objective taxonomy.
- optimization_goal canonical mapping owner.
- whether to use enum, lookup table, or text with check constraints.

Risk:

- if values remain free text, near-duplicate objective names may fragment benchmark cohorts.
- if raw labels are stored in normalized rows, campaign naming conventions can leak advertiser context.

### 5.2 Spend, Currency, and Net/Gross

Current sufficiency:

- `spend` and `currency` are required.
- `net_or_gross` and `markup_policy` are required metadata for approval readiness.
- mixed currency and unknown Net/Gross are warning/blocking states.

Ready for SQL draft:

- include `spend numeric`.
- include `currency` as explicit text enum candidate.
- include `net_or_gross` and `markup_policy`.
- include warning/limitation references for approved-with-warning cases.

Hold before migration:

- currency enum list and conversion policy.
- whether unknown Net/Gross is allowed in stored normalized rows at all or only in dry-run reports.
- markup policy enum seed values.

Risk:

- defaulting currency or cost basis silently would corrupt CPM/CPC interpretation.
- mixing net/gross values in one row group should block default benchmark usage.

### 5.3 Impressions, Clicks, Reach, and Frequency

Current sufficiency:

- `impressions` and `clicks` are required numeric fields.
- `reach` is recommended/approval-sensitive, but current harness allows missing reach with warning.
- `frequency` depends on confirmed reach.

Ready for SQL draft:

- `impressions`, `clicks`, and `spend` should be required.
- `reach` should be nullable but tracked with warning/metric status.
- `frequency` should be nullable and derived-only unless source value is reconciled.

Hold before migration:

- reach semantic confirmation for dashboard aliases such as reach-like or unique impression fields.
- minimum acceptable reach quality for frequency benchmark usage.

Risk:

- treating unconfirmed reach as Meta reach may produce misleading frequency.
- forcing frequency to zero when reach is missing would hide data quality issues.

### 5.4 Derived Metrics

Current sufficiency:

- formulas are documented and implemented in dry-run preview.
- zero division handling uses null/block status, not fallback defaults.
- LLM must not calculate derived metrics.

Ready for SQL draft:

- include `cpm`, `cpc`, `ctr`, and `frequency` as nullable numeric fields.
- include `metric_status` or warning codes to explain nulls and limitations.
- include deterministic formula notes in SQL draft comments or companion docs.

Hold before migration:

- reported vs calculated metric reconciliation tolerance.
- whether to store both source-reported and calculated metrics.
- numeric precision/scale standard.

Risk:

- storing only final metric values without metric status makes zero denominator and reconciliation failures invisible.
- storing both source and calculated metrics without naming conventions creates ambiguity.

### 5.5 Breakdown Fields

Current sufficiency:

- proposed breakdown fields cover age, gender, device, placement, creative format, industry, region, and aggregation level.
- mixed breakdown handling is warning/blocking in validation design.

Ready for SQL draft:

- include nullable breakdown fields.
- include `breakdown_signature`.
- include `aggregation_level` or `period_granularity`.

Hold before migration:

- first MVP grain decision.
- whether industry is required and which taxonomy owns it.
- whether placement/device values need lookup tables.
- how mixed breakdown rows are split before promotion.

Risk:

- too many optional breakdown dimensions may produce sparse cohorts and low confidence.
- storing raw campaign-derived industry labels can leak client context or create noisy taxonomy.

### 5.6 Source Fingerprint

Current sufficiency:

- source fingerprint is consistently proposed for upload, report, review event, and normalized row lineage.
- raw file path should not be report-ready.

Ready for SQL draft:

- include `source_fingerprint` on upload and normalized rows.
- include `input_fingerprint` or equivalent on report/review events.
- include `trace_id` for operator action correlation.

Hold before migration:

- hash policy, salt/scope ownership, and collision/rotation approach.
- whether source fingerprint is content hash, metadata hash, or upload-package hash.

Risk:

- an unsalted or too-specific hash may become a re-identification clue in small datasets.
- storing local paths instead of fingerprints is not acceptable.

### 5.7 Reviewer Fields

Current sufficiency:

- workflow defines uploader, reviewer, admin, data steward, and audit actor.
- proposal includes `created_by`, `reviewed_by`, and review events.

Ready for SQL draft:

- include actor references as opaque ids.
- include `reviewed_at`, `reviewer_status`, and accepted warnings/limitations.
- keep reviewer decision in review events; normalized rows should reference outcome/status only.

Hold before migration:

- actor source of truth.
- self-approval prevention rule.
- whether reviewer role comes from Agent Core, auth provider, or local policy.

Risk:

- if actor identity is not stable, audit and rollback become weak.
- if uploader can approve own upload, benchmark quality gate collapses.

### 5.8 Dataset Version Fields

Current sufficiency:

- version table proposal covers status, window, counts, activation/deprecation metadata.
- normalized rows link to dataset version.

Ready for SQL draft:

- include `dataset_version_id`, `version_label`, `status`, `row_count`, `source_upload_count`, window dates, activation/deprecation fields.
- include active/deprecated/revoked lifecycle.

Hold before migration:

- dataset scope and uniqueness rule.
- activation authority.
- whether long-term rows share or split versions.

Risk:

- without version scope, multiple active versions may produce inconsistent benchmark outputs.
- without rollback strategy, revocation may require ad hoc deletion.

## 6. RLS and Permission Readiness

### 6.1 Uploader

Readiness:

- role is sufficiently defined for SQL draft notes.
- migration must wait for actual auth/actor source.

Candidate permissions:

- create upload metadata for own candidate.
- view own non-sensitive status and correction reasons.
- cannot read restricted raw retention refs.
- cannot approve, promote, or activate dataset versions.

Required RLS tests before migration:

- uploader cannot read another uploader's upload.
- uploader cannot read full privacy/security findings.
- uploader cannot approve own report.
- uploader cannot write normalized rows.

### 6.2 Reviewer

Readiness:

- role is sufficiently defined for SQL draft notes.
- migration must wait for assignment model.

Candidate permissions:

- read assigned sanitized dry-run reports.
- write review events for assigned report version.
- approve, reject, request correction, trend-only, or aggregate-only.
- cannot write normalized benchmark rows directly.
- cannot bypass `security_failed`.

Required RLS tests before migration:

- reviewer can only act on assigned or permitted reports.
- reviewer decision binds to report version.
- reviewer cannot alter past events.
- reviewer cannot promote data without later controlled process.

### 6.3 Admin / Data Steward

Readiness:

- responsibilities are clear, but authority source is unresolved.

Candidate permissions:

- assign reviewers.
- approve retention exception.
- manage taxonomy decisions.
- activate/deprecate dataset versions through audited path.
- inspect restricted evidence only if policy allows.

Required RLS tests before migration:

- admin cannot expose raw values through normal report API.
- data steward cannot mutate audit history.
- retention exception requires audit event.

### 6.4 Service Role / Internal Actor

Readiness:

- service boundary is conceptually sufficient.
- exact implementation must wait for Security/Data Core.

Candidate permissions:

- generate dry-run report rows in a future guarded process.
- write audit events.
- promote approved normalized rows only under explicit operation type in later Gate.

Required constraints:

- fail closed without operation authority.
- no browser/client service role access.
- trace id required.
- no raw token/provider response logging.
- no combined review-and-import path.

### 6.5 Ordinary User Read Restrictions

Readiness:

- ordinary user restrictions are sufficient for draft.
- report-safe serving view/query still needs design.

Candidate permissions:

- no direct read of uploads, dry-run reports, review events, raw refs, or identifier policy internals.
- may later read active aggregate benchmark outputs through a sanitized view/API.

Required RLS tests before migration:

- ordinary user cannot select from raw/review tables.
- ordinary user sees active/report-safe aggregate only.
- ordinary user cannot infer source upload identity.

### 6.6 Fail-closed Guard Need

SQL draft should assume:

- default deny on all proposed tables.
- explicit role policies only.
- no public table access.
- API guard and route-level authorization are still required even with RLS.

Migration blocker:

```text
No DB application until RLS policy tests exist for uploader, reviewer,
admin/data steward, internal actor, and ordinary user paths.
```

## 7. Audit and Operator Linkage

### 7.1 Event-to-row Linkage

| Event | Must link to | Reason |
| --- | --- | --- |
| `benchmark_upload_submitted` | `benchmark_uploads.upload_id`, `source_fingerprint`, `trace_id` | intake lineage |
| `benchmark_dry_run_completed` | `benchmark_uploads.upload_id`, `benchmark_dry_run_reports.report_id`, `report_version`, `trace_id` | validation evidence |
| `benchmark_review_requested` | `report_id`, `upload_id`, reviewer actor | assignment accountability |
| `benchmark_approved` | `report_id`, `report_version`, reviewer actor, accepted warning codes | approval evidence |
| `benchmark_rejected` | `report_id`, reviewer actor, reason code | rejection and correction lineage |
| `benchmark_correction_requested` | `report_id`, missing/correction fields | uploader remediation |
| `benchmark_promoted_to_normalized_dataset` | `dataset_version_id`, `source_fingerprint`, row count, actor | future controlled promotion |
| `benchmark_dataset_version_activated` | `dataset_version_id`, actor, trace id | serving state change |
| `benchmark_dataset_version_deprecated` | `dataset_version_id`, actor, reason code | rollback/deprecation |

### 7.2 Trace ID and Source Fingerprint

Readiness:

- both are necessary and ready for SQL draft.

Recommended use:

- `trace_id` follows one operator action or system job.
- `source_fingerprint` ties upload/report/normalized rows without exposing raw path.
- `input_fingerprint` may identify dry-run input package.
- `dataset_version_id` identifies serving release.

Hold before migration:

- exact trace id format.
- hash/salt ownership.
- whether fingerprints are generated by Foresight, Data Core, or Agent Core.

### 7.3 Forbidden Audit Payload

Audit and report storage must not contain:

- raw token, credential, session, cookie, API key, or signed URL value.
- raw provider response.
- raw campaign-level row.
- raw campaign/account/ad/adset identifier value.
- advertiser, client, brand, or account name unless separately approved and masked.
- local file path in report-ready fields.

Readiness decision:

```text
Audit linkage is sufficient for SQL draft.
Audit implementation ownership remains a migration blocker.
```

## 8. Data Retention and Privacy Review

### 8.1 Raw File Storage

Current decision:

- default is `do_not_store`.
- raw file storage is not approved by this Gate.

SQL draft readiness:

- `raw_file_retention_policy` can be drafted.
- `raw_file_storage_ref` can be nullable and restricted.

Hold before migration:

- storage location.
- retention duration.
- access log owner.
- security hold process.
- deletion/expiry process.

### 8.2 Raw Campaign Identifier Masking

Current decision:

- identifiers are raw-zone or review-only metadata.
- normalized rows must not contain raw account/campaign/ad identifiers.

SQL draft readiness:

- include `identifier_policy`, `privacy_boundary_status`, or warning code references.
- exclude raw identifier fields from normalized rows.

Hold before migration:

- approved hash/count policy.
- whether restricted identifier lineage belongs in a separate table.
- masking rules for source column labels.

### 8.3 Smoke/Test Exclusion

Current decision:

- `inline_mock` and harness mock cases are test-only.
- mock outputs cannot become benchmark facts.

SQL draft readiness:

- include source type and environment labels sufficient to exclude test data.
- consider `source_type` or `is_test_source` guard in SQL draft.

Hold before migration:

- non-production seed strategy.
- test data tagging convention.
- production check to block synthetic/mock source types from activation.

### 8.4 Long-term Trend Separation

Current decision:

- recent 6-month benchmark and long-term trend must be separated.
- `benchmark_window` should be `recent_6m` or `long_term`.

SQL draft readiness:

- include `benchmark_window`.
- include dataset version window fields.
- include `excluded_from_default_benchmark` in reports or normalized row status.

Hold before migration:

- authoritative `as_of_date`.
- versioning strategy for long-term rows.
- default-serving filter for recent benchmark.

### 8.5 No Raw Campaign Data to LLM

Current decision:

- normalized rows may be report/LLM eligible only if aggregate and identifier-free.

SQL draft readiness:

- include `llm_eligible` and `report_eligible` or enforce through serving view.
- include privacy boundary fields.

Hold before migration:

- exact report-safe view/API contract.
- final list of fields allowed to leave DB into report/LLM layer.

## 9. Schema Blockers

### 9.1 AdMate Data Core Target Schema Decision

Blocker:

- decide whether the schema belongs in Foresight-owned namespace, Data Core-owned namespace, or shared analytical schema.

Impact:

- table names, ownership, migration repo, RLS owner, and audit linkage may change.

Recommendation:

- SQL draft may use `foresight.*` as proposal namespace only.
- migration must wait for Data Core decision.

### 9.2 Non-production Dry-run Environment

Blocker:

- no non-production DB target and synthetic promotion path has been approved in this Gate.

Impact:

- migration cannot be safely tested.
- RLS cannot be verified.

Recommendation:

- prepare SQL draft only.
- plan non-production dry-run migration in a later Gate.

### 9.3 Backup and Export Plan

Blocker:

- no backup/export/restore plan exists for these proposed tables.

Impact:

- rollback could require manual data surgery.
- version deprecation may not be enough if migration shape is wrong.

Recommendation:

- SQL draft should include rollback notes, but no application until backup/export plan exists.

### 9.4 Reviewer Role Source

Blocker:

- uploader/reviewer/admin/data steward actor source of truth is not decided.

Impact:

- RLS policies cannot be implemented safely.
- self-approval prevention cannot be tested.

Recommendation:

- draft opaque actor references.
- defer concrete FK/auth binding.

### 9.5 Migration Rollback Strategy

Blocker:

- no approved rollback strategy for table creation, enum seeds, RLS policies, and version activation.

Impact:

- failed migration may leave partial policies or active dataset confusion.

Recommendation:

- later migration plan must include disable-first rollback, version deactivation, and policy rollback.

### 9.6 Seeded Status Enum Decision

Blocker:

- status values are documented but not finalized as enum types, check constraints, or lookup tables.

Affected statuses:

- upload status
- validation status
- approval status
- review decision
- dataset version status
- benchmark window
- retention policy
- source type
- role type
- confidence bucket

Recommendation:

- SQL draft can list candidate enums.
- migration should wait until status ownership and extension path are reviewed.

## 10. Ready for SQL Draft

The following are ready to move into a SQL draft document or migration preparation note, without applying it:

1. Candidate table set:
   - `foresight.benchmark_uploads`
   - `foresight.benchmark_dry_run_reports`
   - `foresight.benchmark_review_events`
   - `foresight.normalized_benchmark_rows`
   - `foresight.benchmark_dataset_versions`

2. Core lineage fields:
   - upload/report/dataset ids
   - `source_fingerprint`
   - `input_fingerprint`
   - `trace_id`
   - created/reviewed/generated actor references

3. Core normalized row fields:
   - platform/source_type
   - date_start/date_stop/period_granularity
   - objective/optimization_goal
   - currency/net_or_gross/markup_policy
   - impressions/clicks/spend
   - nullable reach/frequency/derived metrics
   - sample_size/confidence_bucket/benchmark_window/reviewer_status

4. Dataset version lifecycle:
   - draft/active/deprecated/revoked status candidate
   - activation/deprecation actor and timestamps
   - row/source counts

5. Explicit exclusions:
   - no raw campaign/account/ad identifiers in normalized rows
   - no raw rows in dry-run report JSON
   - no raw provider response or token-like values in audit payload

## 11. Hold Before SQL Draft or Migration

The following should not be finalized as SQL behavior yet:

| Item | Hold reason | Next decision owner |
| --- | --- | --- |
| Physical schema namespace | Data Core target schema unresolved | Data Core / Foresight owner |
| Actual migration file | No non-production plan or rollback yet | Foresight + Data Core |
| RLS policies | Actor/role source unresolved | Agent Core / Security |
| Raw file storage refs | Retention/storage location unresolved | Security / Data steward |
| Identifier hash table | Hash policy and access boundary unresolved | Data Core / Security |
| Status enums | Seed and extension strategy unresolved | Foresight / Data Core |
| Dataset active uniqueness | Version scope unresolved | Data Core |
| Report-safe serving view | API/report boundary unresolved | Foresight / Security |
| Metric precision/scale | Numeric standard unresolved | Data steward |
| Confidence thresholds | Sample sufficiency policy unresolved | Data steward / Product |

## 12. SQL Draft Readiness Verdict

Verdict:

```text
Proceed to SQL draft preparation only.
Do not create migration files yet.
Do not apply schema.
Do not connect to DB.
```

Rationale:

- table responsibilities are clear enough to draft.
- required fields are mostly sufficient.
- raw/privacy boundaries are clear enough to encode as exclusions and comments.
- RLS and audit concepts are defined, but not implementable without actor/source ownership.
- retention, backup/export, and rollback remain blockers for any migration.

Minimum acceptance criteria for next SQL draft Gate:

- DDL draft is a document or un-applied SQL draft only, unless user explicitly approves migration file creation.
- all tables include comments or companion notes for forbidden raw data.
- all draft enums/check constraints remain candidate status.
- RLS policies are described as TODO candidates, not silently omitted.
- no raw seed data, fixture files, Excel/CSV, or model artifacts are added.

## 13. Follow-up Gates

### Foresight-Benchmark-11: Schema Draft SQL Preparation

Scope candidate:

- prepare an un-applied SQL draft or SQL design document.
- include candidate DDL, comments, enum/check candidates, and RLS TODOs.
- no DB connection or migration application.

### Foresight-Benchmark-12: Nonprod Dry-run Migration Plan

Scope candidate:

- plan non-production migration sequence.
- define backup/export, rollback, RLS tests, seeded status strategy, and synthetic-only verification.
- still no production schema application.

### Foresight-Benchmark-13: Dry-run Report API Implementation Plan

Scope candidate:

- plan guarded dry-run report API only after schema/report storage readiness.
- include auth, audit, rate limit, no-store response, request size limit, and redaction.
- no raw upload persistence or normalized promotion by default.

## 14. Final Recommendation

Benchmark-10 recommends:

```text
1. Move forward with SQL draft preparation as documentation/design only.
2. Keep migration, DB application, and schema changes blocked.
3. Treat normalized rows as aggregate canonical facts only.
4. Keep dry-run reports sanitized and versioned.
5. Resolve Data Core ownership, RLS actor source, retention, backup/export,
   enum seeding, and rollback before any migration Gate.
```
