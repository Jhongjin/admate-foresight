# AdMate Foresight Benchmark Dry-run Harness Design v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-5 upload parser dry-run harness design

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Foresight benchmark 업로드 파일을 실제 DB 저장, 모델 학습, LLM 전달 없이 dry-run으로 검증하는 harness 설계를 정의한다.

이번 Gate는 설계 문서화만 수행한다. 코드, API route, DB schema, Supabase RPC, import/export, Meta API 호출은 변경하거나 실행하지 않는다.

Dry-run harness의 목적은 다음이다.

1. 업로드 후보 파일을 저장 또는 승인하기 전에 구조를 검증한다.
2. sheet/header/column 구조를 확인하고 column mapping report를 생성한다.
3. Benchmark-3 reject/warning rule과 Benchmark-4 mapping confidence rule을 적용한다.
4. CPM, CPC, CTR, frequency 등 derived metric 계산 가능성을 미리 확인한다.
5. token, URL, secret-like value, raw campaign identifier 노출 등 privacy/security boundary 위반을 탐지한다.
6. reviewer가 승인, 보류, 재업로드 요청, mapping 수정 요청을 판단할 수 있는 sanitized report를 만든다.

핵심 원칙:

```text
Dry-run reads candidate structure.
Dry-run does not persist benchmark facts.
Dry-run does not train models.
Dry-run does not call Meta API.
Dry-run does not send raw rows to LLM.
```

## 2. Scope and Non-scope

### 2.1 Scope

- Excel/CSV 후보 파일의 dry-run 입력 조건 정의
- sheet 선택, header row 탐지, empty row, merged cell, hidden sheet 처리 기준 정의
- masked sample preview 허용 범위 정의
- output report 후보 정의
- fail-closed rule 정의
- deterministic metric preview 기준 정의
- suspicious metric detection 기준 정의
- date range and recent 6-month window check 정의
- fixture spec 설계
- 구현 후보 파일 위치와 우선순위 제안

### 2.2 Non-scope

- 실제 fixture 파일 생성
- actual parser implementation
- upload UI implementation
- API route implementation
- DB connection, import, export, migration
- Meta API direct pull
- token/env/secret 열람 또는 출력
- raw Excel/CSV/model artifact repo 추가
- commit, push, PR 생성

## 3. Dry-run Flow Candidate

Recommended dry-run flow:

```text
Candidate Excel/CSV selected locally
→ file-level preflight
→ workbook/sheet inventory
→ header row detection
→ source column normalization
→ alias-based column mapping
→ required field validation
→ privacy/security scan
→ deterministic metric preview
→ date window classification
→ sanitized preview sample generation
→ mapping and validation report
→ reviewer action decision
```

Dry-run output should be a report only. It must not create approved benchmark rows, model artifacts, DB records, LLM prompts, or export files unless a later approved implementation explicitly defines a safe local output path.

## 4. Input Conditions

### 4.1 Accepted Candidate Inputs

Candidate input types:

| Input type | Allowed for dry-run | Notes |
| --- | --- | --- |
| `.xlsx` | Yes | Read workbook/sheet/header structure only. |
| `.xls` | Conditional | Allow only if parser safely supports legacy format. |
| `.csv` | Yes | Single table profile. |
| `.tsv` | Optional | Treat as CSV-like if explicitly supported. |

Not allowed:

- raw API JSON response archive
- model artifact
- compressed raw data bundle
- browser session export with embedded signed URL
- script output containing credentials
- files stored inside repo as raw campaign data

### 4.2 File-level Preflight

The harness should inspect file metadata before parsing content.

Candidate checks:

| Check | Purpose | Fail/warn |
| --- | --- | --- |
| file extension | confirm supported parser profile | fail for unsupported |
| file size | avoid accidental huge raw upload | warn or fail by policy threshold |
| file name | detect obvious credential/session wording | warn, fail if secret-like |
| workbook encryption/macro presence | avoid unsafe parsing | fail or require reviewer |
| source hash | dedupe and lineage | report only in dry-run |
| modified timestamp | reviewer context | report only |

File path should not be included in LLM/report-ready output. If needed, dry-run report should use a local-only reference or source hash.

### 4.3 Sheet Selection

For Excel workbooks, the harness should inventory all sheets first.

Sheet handling rules:

| Sheet condition | Dry-run behavior |
| --- | --- |
| visible sheet with known aliases | candidate parsing sheet |
| hidden sheet | report as `hidden_sheet_detected`; do not parse by default |
| very hidden sheet | fail or require security review |
| empty sheet | record as ignored |
| chart/pivot-only sheet | ignored unless table headers detected |
| multiple candidate sheets | parse each separately and require reviewer selection or profile rule |

Recommended sheet summary fields:

```text
sheet_name_masked
sheet_index
visibility
row_count_estimate
column_count_estimate
candidate_header_rows
known_alias_count
selected_for_mapping
selection_reason
```

### 4.4 Header Row Detection

Dashboard samples may have title and metadata rows above the actual header. The harness should not assume row 1 is the header.

Candidate detection rules:

1. Score each row by known alias hits from Benchmark-4 alias registry.
2. Prefer rows containing two or more core metric aliases such as impressions/clicks/CTR/reach.
3. Prefer rows containing at least one date or period alias.
4. Reject header candidates that look like raw campaign rows rather than labels.
5. If multiple rows tie, require reviewer confirmation.

Header detection output:

```text
header_row_index
header_detection_confidence
known_alias_hits
unknown_header_count
duplicate_header_count
empty_header_count
reviewer_confirmation_required
```

### 4.5 Empty Rows, Merged Cells, and Layout Artifacts

| Condition | Dry-run behavior |
| --- | --- |
| empty row before header | ignore |
| empty row after header | count as empty data row and ignore |
| merged title cells | treat as metadata candidate, not data |
| merged header cells | warn and require profile-specific rule |
| blank spacer columns | map to `ignored_layout_column` |
| repeated subtotal rows | warn and require subtotal exclusion rule |

Dry-run should not infer missing required fields from merged cells unless the parser profile explicitly supports that layout.

### 4.6 Masked Sample Preview

Sample row preview is allowed only in masked, limited form.

Allowed preview:

- column names
- inferred value type
- null/non-null counts
- masked date pattern
- numeric range bucket or presence indicator
- identifier presence flag
- sanitized first N pattern rows with no raw identifiers

Not allowed preview:

- advertiser name
- account id/name
- campaign id/name
- adset/ad id/name
- raw spend/click/impression row values tied to campaign identifiers
- token, credential, session URL, request URL with secret
- raw file path in report-ready output

Example masked preview shape:

```text
row_pattern
  date_start: YYYY-MM-DD
  impressions: numeric_present
  clicks: numeric_present
  spend: numeric_present
  campaign_identifier: masked_present
  objective: canonical_or_unmapped
```

## 5. Output Report Candidate

The dry-run harness should produce a structured report that can be viewed by a reviewer and optionally archived as sanitized metadata.

### 5.1 `file_summary`

```text
file_summary
  source_hash
  file_type
  file_size_bucket
  detected_workbook_type
  sheet_count
  visible_sheet_count
  hidden_sheet_count
  parser_profile_candidates
  preflight_status
```

### 5.2 `sheet_summary`

```text
sheet_summary[]
  sheet_reference
  visibility
  estimated_rows
  estimated_columns
  header_row_index
  header_detection_confidence
  selected_for_mapping
  ignored_reason
```

### 5.3 `mapping_report`

```text
mapping_report
  parser_profile
  source_type
  schema_mapping_version
  canonical_field_status
  mapping_confidence_summary
  metric_reconciliation_status
  validation_status
  approval_blockers
```

### 5.4 `accepted_columns`

```text
accepted_columns[]
  source_sheet
  source_column_masked_or_label
  normalized_source_column
  canonical_field
  mapping_confidence
  parsed_value_type
  required_field
```

### 5.5 `rejected_columns`

```text
rejected_columns[]
  source_sheet
  source_column_masked_or_label
  reason_code
  severity
  reviewer_action_required
```

Reason code candidates:

- `empty_or_layout_artifact`
- `duplicate_conflict`
- `unsupported_metric`
- `unknown_semantics`
- `invalid_type`
- `secret_or_session_like`
- `unsafe_identifier_for_output`

### 5.6 `missing_required_fields`

```text
missing_required_fields[]
  canonical_field
  required_for
  detected_aliases
  remediation_hint
  blocks_storage
```

Required fields from Benchmark-3:

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

### 5.7 `warnings`

```text
warnings[]
  warning_code
  severity
  affected_field
  affected_sheet
  affected_count_bucket
  reviewer_decision_required
  limitation_text_candidate
```

### 5.8 `derived_metric_preview`

```text
derived_metric_preview
  cpm_status
  cpc_status
  ctr_status
  frequency_status
  zero_division_findings
  suspicious_metric_findings
  metric_reconciliation_status
```

Preview should show calculation status and aggregate sanity, not raw row-level campaign metrics.

### 5.9 `privacy_findings`

```text
privacy_findings
  identifier_columns_detected
  advertiser_or_brand_columns_detected
  raw_identifier_in_output_risk
  secret_like_value_detected
  url_like_value_detected
  llm_boundary_status
  recommended_action
```

### 5.10 `reviewer_action_required`

```text
reviewer_action_required[]
  action_type
  reason
  blocking
  suggested_owner
```

Action type candidates:

- `provide_missing_metadata`
- `select_sheet`
- `confirm_header_row`
- `confirm_reach_semantics`
- `split_mixed_currency`
- `split_recent_and_long_term`
- `remove_or_mask_identifier_output`
- `reject_and_request_new_export`

### 5.11 `normalized_preview_sample`

The normalized preview sample should contain only masked or aggregate-safe fields.

Allowed fields:

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

Do not include raw row-level spend, clicks, impressions, campaign names, account names, or advertiser names in report-ready preview.

## 6. Fail-closed Rules

Dry-run must fail closed. If a required safety or validation condition is uncertain, the harness should block storage/approval until a reviewer resolves it.

| Condition | Required behavior |
| --- | --- |
| required field missing | storage, benchmark promotion, model use, and LLM/report-ready output are blocked |
| token/secret-like value detected | stop processing and require security review |
| session URL or signed URL detected | stop processing and require security review |
| raw campaign identifiers configured for LLM/report output | block report-ready output |
| advertiser/account/campaign names unmasked in preview | block report-ready output |
| currency missing or mixed | block approval until metadata or split is provided |
| Net/Gross unclear | approval required; default benchmark use blocked |
| markup policy unclear | approval required; commercial benchmark use blocked |
| recent and long-term data mixed | block approval until split |
| hidden sheet with data-like content | require reviewer/security review |

Fail-closed does not mean deleting the candidate file. It means dry-run report returns a rejected or blocked status and no downstream write/use action occurs.

## 7. Deterministic Calculation Preview

The dry-run harness should check whether derived metrics can be calculated. It does not need to produce final benchmark values in this Gate.

### 7.1 Core Formula Candidates

| Metric | Formula | Required inputs | Preview output |
| --- | --- | --- | --- |
| CPM | `spend / impressions * 1000` | spend, impressions | calculable, blocked, or warning |
| CPC | `spend / clicks` | spend, clicks | calculable, blocked, or warning |
| CTR | `clicks / impressions` | clicks, impressions | calculable, blocked, or warning |
| frequency | `impressions / reach` | impressions, reach | calculable, blocked, or warning |

Rules:

- use null status, not zero fallback, when denominator is invalid
- preserve reported metrics separately from calculated metrics
- do not use UI fallback defaults from prediction paths
- do not let LLM calculate or reinterpret metrics

### 7.2 Zero Division Handling

| Case | Handling |
| --- | --- |
| impressions = 0 and CPM requested | `cpm_status = blocked_zero_impressions` |
| clicks = 0 and CPC requested | `cpc_status = blocked_zero_clicks` |
| impressions = 0 and CTR requested | `ctr_status = blocked_zero_impressions` |
| reach = 0 or missing and frequency requested | `frequency_status = blocked_missing_or_zero_reach` |

Rows with zero denominators should be counted and summarized. The dry-run report should not dump raw rows.

### 7.3 Suspicious Metric Detection

Suspicious metric detection should identify values that require reviewer attention.

Candidate signals:

- negative spend, impressions, clicks, or reach
- clicks greater than impressions
- reach greater than impressions when not expected by source semantics
- frequency far below or above plausible campaign ranges
- reported CTR/CPM/CPC differs from calculated value beyond future tolerance
- spend present but currency missing
- source CTR unit ambiguous between ratio and percent
- large number of zero or null core metric values
- duplicate metric columns with conflicting values

Suspicious metrics should produce warnings or rejects depending on severity.

### 7.4 Date Range and Recent 6-month Check

Dry-run should classify candidate data by date range before any benchmark promotion.

Required checks:

```text
date_start_parse_status
date_stop_parse_status
date_order_status
file_level_date_range
row_group_date_range
as_of_date
recent_6_months_coverage
long_term_trend_coverage
mixed_window_status
```

Window classification:

| Classification | Meaning | Use |
| --- | --- | --- |
| `recent_6_months` | data falls within recent benchmark window | default benchmark candidate |
| `long_term_trend` | data is older than recent window | trend reference only |
| `mixed_window` | recent and older data mixed | split required |
| `date_unparseable` | date cannot be trusted | reject |

## 8. Privacy and Security Scan

Dry-run should scan structure and masked values for privacy and security risk before producing any report-ready preview.

### 8.1 Secret-like and URL-like Findings

Fail immediately if the candidate contains:

- token-like value
- API key-like value
- authorization header-like value
- cookie/session-like value
- signed URL or browser session URL
- database connection string-like value
- private credential field

The report should state the finding category and affected column/sheet, not the value.

### 8.2 Raw Identifier Findings

Identifier-heavy files are not automatically invalid, but identifiers must stay in raw zone or review-only metadata.

Detect and classify:

- account id/name
- campaign id/name
- adset/ad group id/name
- ad id/name
- creative id/name
- advertiser or brand name

Required behavior:

- default masking
- no LLM/report-ready output
- reviewer must confirm whether identifier columns are needed for dedupe or lineage
- normalized preview may include counts or masked-present flags only

## 9. Test Fixture Spec

This Gate does not create actual test files. It defines fixture scenarios for a future dry-run harness implementation.

### 9.1 Fixture: Good Sample

Purpose:

- confirm a complete Meta-compatible manual export can pass dry-run

Required characteristics:

- includes platform/source_type metadata
- includes date_start/date_stop or parseable date
- includes objective and optimization_goal
- includes spend, currency, impressions, clicks, reach
- includes clear Net/Gross and markup policy metadata
- has no raw identifiers in report-ready output

Expected result:

```text
validation_status = passed
approval_status = validated
reviewer_action_required = confirm approval
```

### 9.2 Fixture: Missing Spend

Purpose:

- ensure spend absence blocks CPM/CPC benchmark use

Characteristics:

- impressions/clicks present
- spend missing
- currency may be present or absent

Expected result:

```text
validation_status = failed
missing_required_fields includes spend
blocks_storage = true
```

### 9.3 Fixture: Mixed Currency

Purpose:

- ensure mixed currency does not silently aggregate

Characteristics:

- valid metrics
- two or more currency values

Expected result:

```text
validation_status = warning_or_failed
warnings includes mixed_currency
reviewer_action_required includes split_mixed_currency
approval blocked until split or approved conversion policy
```

### 9.4 Fixture: Token-bearing URL

Purpose:

- ensure secret/session exposure is fail-closed

Characteristics:

- a URL-like field contains credential/session/token-like content
- may otherwise have valid metric columns

Expected result:

```text
validation_status = security_failed
processing_stopped = true
privacy_findings.secret_like_value_detected = true
no normalized preview generated
```

The fixture spec must not store actual tokens or credential-like values in repo.

### 9.5 Fixture: Long-term Data

Purpose:

- ensure data older than recent benchmark window is separated

Characteristics:

- date range entirely older than recent 6-month window
- metrics otherwise valid

Expected result:

```text
window_policy = long_term_trend
excluded_from_default_benchmark = true
approval requires trend-only labeling
```

### 9.6 Fixture: Raw Identifier Heavy Sample

Purpose:

- ensure campaign/account/ad identifiers stay out of LLM/report-ready output

Characteristics:

- account, campaign, adset, ad, advertiser, brand columns present
- metrics otherwise valid

Expected result:

```text
privacy_findings.identifier_columns_detected = true
normalized_preview_sample masks identifier fields
llm_boundary_status = safe_only_if_aggregate
reviewer_action_required includes confirm_identifier_handling
```

## 10. Implementation Candidate Files

This section proposes future implementation locations. It does not authorize implementation in this Gate.

### 10.1 MVP Priority: CLI/local Harness

Recommended first implementation target:

| Candidate location | Purpose | Notes |
| --- | --- | --- |
| `scripts/benchmark_dry_run.*` | local CLI dry-run harness | Lowest blast radius; no API or DB required. |
| `tests/fixtures/benchmark-dry-run/` | future sanitized fixture definitions | Fixture specs only or small synthetic files after approval. |
| `tests/benchmark-dry-run.*` | parser regression tests | Should use synthetic, non-sensitive data only. |

MVP should prefer a CLI/local harness because:

- it avoids exposing upload parsing through an API route too early
- it can run without DB credentials
- it can fail closed before UI/API integration
- it can use synthetic or sanitized fixtures

### 10.2 Mapper Library Candidate

| Candidate location | Purpose | Notes |
| --- | --- | --- |
| `lib/benchmark/columnAliases.*` | alias registry | Shared by CLI and future UI/API. |
| `lib/benchmark/columnMapper.*` | source column to canonical mapping | Pure deterministic logic. |
| `lib/benchmark/dryRunReport.*` | report shape and serializers | Must avoid raw row dumps. |
| `lib/benchmark/privacyScan.*` | identifier and secret-like scanner | Must report categories, not values. |

These should be added only in a later implementation Gate.

### 10.3 API Route Candidate, Later Priority

API route should be lower priority than CLI/local harness.

Potential future route:

```text
POST /api/benchmark/dry-run
```

Required preconditions before any API route:

- auth guard
- admin/reviewer role check
- file size limit
- rate limit
- no persistent raw file by default
- sanitized logging
- audit event design
- production environment policy

## 11. Reviewer Workflow Candidate

Dry-run should help the reviewer decide what happens next.

Candidate reviewer outcomes:

| Outcome | Meaning |
| --- | --- |
| `reject_file` | source file cannot be used |
| `request_new_export` | required source columns missing |
| `request_metadata` | metadata such as currency or Net/Gross missing |
| `confirm_mapping` | aliases and header row need reviewer confirmation |
| `approve_trend_only` | long-term data can be retained as trend reference only |
| `approve_for_normalization` | candidate can move to normalized dataset design flow |

No outcome in this Gate should trigger actual DB write or benchmark promotion.

## 12. Current Implementation Alignment

Read-only findings from current implementation:

- `lib/xlsxLoader.ts` consumes legacy aggregate fields for industry, objective, optimization goal, placement, creative format, gender, age, reach, impressions, spend, frequency, CPM, CPC, CPC Link, video views, video view cost, and date.
- `lib/predictor.ts` derives and uses weighted CPM, weighted CPC, reach, frequency, CPV, VTR, market averages, and top efficiency lines.
- `lib/regression.ts` trains CPM/CPC/VTR models using spend-weighted records and categorical dimensions.
- `python/data_loader.py` loads aggregate RPC outputs such as `avg_cpm`, `avg_cpc`, `sum_도달`, `sum_노출`, and `sum_지출금액`.

Dry-run harness should sit before these paths. A candidate upload should not enter prediction, training, DB, or LLM flows until it has passed validation, mapping, privacy scan, reviewer approval, and a separately approved normalization/import process.

## 13. Open Questions

1. What maximum file size should fail preflight?
2. Should hidden sheets be hard-fail or reviewer-gated?
3. What numeric tolerance should be used for reported vs calculated CPM/CPC/CTR mismatch?
4. What is the official source of `as_of_date` for recent 6-month classification?
5. Should dry-run reports be stored, and if so, where can sanitized reports live?
6. Which role model owns reviewer approval before benchmark promotion?
7. Can dry-run use synthetic fixture files in repo, or should fixtures remain metadata-only?
8. Should CLI harness support both CSV and XLSX in the first implementation Gate?

## 14. Follow-up Gates

### Foresight-Benchmark-6: Dry-run Harness Implementation

Scope:

- implement local CLI dry-run harness
- implement alias registry and report shape
- use synthetic/sanitized fixtures only after approval
- no DB write/import/export
- no Meta API call
- no LLM forwarding

### Foresight-Security-1: Debug/Meta API Route Hardening Review

Scope:

- review debug, retrain, sync, and scraping routes
- define auth guard, admin allowlist, rate limit, audit log, and production disablement requirements
- no implementation unless separately approved

### Foresight-DB-2: Legacy DB Live Read-only Inventory Retry

Scope:

- retry metadata-only legacy DB inventory with a valid read-only path
- inspect schema/table/column/RLS/index/function/storage/auth metadata
- count rows without raw row output
- no import/export/migration

## 15. Final Recommendation

Gate Foresight-Benchmark-5 recommends a fail-closed local dry-run harness:

```text
1. Validate candidate upload structure before storage.
2. Generate sanitized mapping and validation reports.
3. Block required-field, secret-like, identifier-output, currency, and Net/Gross risks.
4. Preview deterministic metric calculability without raw row exposure.
5. Use fixture specs first, then implement a CLI/local harness in a later Gate.
```
