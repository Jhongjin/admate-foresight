# AdMate Foresight Benchmark Upload Validation Spec v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-3 manual upload validation and mapping spec

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Foresight MVP에서 사용할 benchmark 데이터 수동 업로드 기준을 정의한다.

이번 Gate의 목적은 구현이 아니라 validation and mapping 기준을 문서화하는 것이다. 코드, API route, DB schema, Supabase RPC, import/export, Meta API 호출은 변경하거나 실행하지 않는다.

MVP upload의 목적은 다음이다.

1. Meta 중심 benchmark 후보 데이터를 dashboard export 또는 Meta-compatible export 파일로 수집한다.
2. 원천 파일을 Foresight source of truth로 보지 않고, approved normalized benchmark dataset 생성 전 validation 대상으로만 사용한다.
3. spend, currency, date range, objective, optimization_goal, breakdown, Net/Gross metadata를 확인해 예측/분석에 쓸 수 있는지 판정한다.
4. raw campaign-level data를 모델 학습, LLM input, 보고서 narrative에 그대로 넣지 않도록 privacy/security boundary를 둔다.
5. uploader/reviewer 승인 흐름을 전제로 향후 Agent Core audit log와 연결 가능한 판단 근거를 남긴다.

핵심 원칙:

```text
Raw Excel/API export
= source evidence 또는 temporary staging input

Approved normalized benchmark dataset
= Foresight benchmark source of truth
```

## 2. Scope and Non-scope

### 2.1 Scope

- 수동 업로드 MVP의 필수 컬럼 후보 정의
- upload metadata 기준 정의
- reject/warning rule 정의
- normalized field mapping 후보 정의
- CPM, CPC, CTR, frequency 등 deterministic metric 계산 기준 정의
- 최근 6개월 benchmark와 long-term trend 분리 기준 정의
- raw campaign-level data, identifier, LLM payload boundary 정의
- 후속 Gate 제안

### 2.2 Non-scope

- 실제 upload UI 구현
- API route 추가 또는 변경
- DB table/schema/RPC 변경
- Supabase 연결, import, export, migration
- Meta API direct pull
- token, key, credential, env 값 열람 또는 출력
- raw Excel/CSV/model artifact 추가
- LLM report endpoint 구현
- commit, push, PR 생성

## 3. Upload Source Types

MVP에서 허용하는 source type 후보는 아래로 제한한다.

| source_type | Description | MVP decision |
| --- | --- | --- |
| `dashboard_export` | 내부 dashboard 또는 운영 리포트에서 내려받은 Excel/CSV | Allowed when required columns and metadata are present |
| `meta_api_export` | Meta API direct pull 결과가 아니라, 사람이 export한 Meta-compatible CSV/XLSX | Allowed when token/session/request secret is not embedded |

MVP에서 허용하지 않는 source type:

- hardcoded token script output
- browser session URL이 포함된 export
- raw Meta API JSON response archive
- advertiser-specific contract sheet
- model artifact or training cache
- uncontrolled local cache file

## 4. Required Column Candidates

필수 컬럼은 file column 또는 upload metadata로 보완할 수 있지만, normalized benchmark candidate에는 아래 필드가 모두 명시되어야 한다.

| Normalized field | Required | Candidate source columns | Notes |
| --- | --- | --- | --- |
| `platform` | Yes | `platform`, `매체`, upload metadata | MVP 기본값은 `meta` 후보이나 암묵 기본값으로 처리하지 않는다. |
| `date_start` | Yes | `date_start`, `date`, `날짜`, parsed `기간` | Row-level 또는 aggregate-level 시작일. |
| `date_stop` | Yes | `date_stop`, `date`, `날짜`, parsed `기간` | Row-level 또는 aggregate-level 종료일. |
| `objective` | Yes | `objective`, `campaign_objective`, `목표` | Canonical mapping 필요. |
| `optimization_goal` | Yes | `optimization_goal`, `최적화목표` | Objective와 별도 보존. |
| `spend` | Yes | `spend`, `amount_spent`, `cost`, `지출금액` | Currency and Net/Gross metadata 없이는 승인 불가. |
| `currency` | Yes | `currency`, upload metadata | 암묵적으로 KRW로 보정하지 않는다. |
| `impressions` | Yes | `impressions`, `Imps.`, `노출` | Numeric required. |
| `clicks` | Yes | `clicks`, `Click`, `클릭` | Numeric required. |
| `reach` | Yes for approved benchmark, warning if absent at intake | `reach`, `Unique Imps.`, `도달` | `Unique Imps.`는 Meta reach와 의미 동일 여부 확인 전 `reach_candidate`로 둔다. |
| `video_views` | Optional | `video_views`, `video_views_3s`, `영상조회수` | VTR/CPV cohort에만 사용. |
| `conversions` | Optional | `conversions`, `purchases`, `leads`, action columns | CPA/CVR cohort에만 사용. |

필수 컬럼이 여러 sheet에 나뉘어 있으면 같은 batch 안에서 join key와 aggregation grain을 명확히 해야 한다. join 기준이 불명확하면 benchmark 후보로 승인하지 않는다.

## 5. Identifier Handling Policy

account/campaign/adgroup/ad identifiers는 validation, dedupe, lineage에는 필요할 수 있지만, 저장/표시/LLM 전달 정책을 분리한다.

| Identifier family | Examples | Staging policy | Normalized benchmark policy | Report/LLM policy |
| --- | --- | --- | --- | --- |
| Account | account id, account name | Restricted staging only | hash or authorized reference | Do not include |
| Campaign | campaign id, campaign name | Restricted staging only | hash or aggregate count | Do not include |
| Ad group / ad set | adset id, adset name, adgroup id | Restricted staging only | hash or aggregate count | Do not include |
| Ad / creative | ad id, ad name, creative id | Restricted staging only | hash or aggregate count | Do not include |
| Advertiser / brand | advertiser name, brand name | Restricted staging only | mapped industry/taxonomy only | Do not include raw name |

원칙:

- raw identifier는 repo 문서, git history, LLM payload, report narrative에 넣지 않는다.
- normalized benchmark에는 원문 identifier 대신 hash, aggregate count, approved dimension만 남긴다.
- hash salt, scope, retention은 Agent Core 또는 approved data governance policy가 정해야 한다.
- campaign name parsing으로 업종을 추출하는 legacy path는 참고만 하며, 장기적으로는 별도 taxonomy mapping을 우선한다.

## 6. Recommended Upload Metadata

업로드 batch에는 아래 metadata를 함께 수집해야 한다.

| Metadata | Required | Candidate values / format | Notes |
| --- | --- | --- | --- |
| `source_type` | Yes | `dashboard_export`, `meta_api_export` | MVP allowed source만 허용. |
| `source_name` | Recommended | dashboard/report/export template name | Human-readable source label. |
| `exported_at` | Yes | ISO-like timestamp or date | Export 실행 시점. |
| `uploaded_at` | Yes | system timestamp | 시스템 기록 대상. |
| `date_range` | Yes | start/end pair | File-level reporting window. |
| `timezone` | Yes | IANA timezone or explicit offset | Date parsing 기준. |
| `currency` | Yes | `KRW`, `USD`, `JPY`, `EUR`, `OTHER` | Mixed currency는 별도 warning/reject. |
| `net_or_gross` | Yes | `net`, `gross`, `unknown` | `unknown`이면 approved benchmark 자동 승인 금지. |
| `markup_policy` | Yes | `included`, `excluded`, `manual_rate`, `unknown` | 계약/수수료 원문은 LLM payload 제외. |
| `markup_rate` | Conditional | numeric or blank | `manual_rate`일 때 필요. |
| `aggregation_level` | Yes | `daily`, `weekly`, `monthly`, `campaign_total`, `campaign`, `adset`, `ad`, `mixed` | Mixed이면 grain rule 필요. |
| `breakdown` | Recommended | age, gender, device, placement, creative_format, region | Multiple breakdowns must be explicit. |
| `uploader` | Yes | user reference | Raw email/name 노출 정책은 Agent Core 기준 준수. |
| `reviewer` | Required before approval | reviewer reference | 승인 전까지 nullable 가능. |
| `approval_status` | Yes | `draft`, `validated`, `warning`, `rejected`, `approved` | Approved만 benchmark source candidate. |
| `schema_mapping_version` | Yes | version label | Mapper change tracking. |
| `source_file_hash` | Yes | hash value | Duplicate detection; raw file path는 외부 노출 금지. |

## 7. Reject Rules

아래 조건 중 하나라도 해당하면 해당 batch 또는 row group은 approved normalized benchmark dataset으로 승격할 수 없다.

| Rule | Reject condition | Reason |
| --- | --- | --- |
| Missing spend/currency | `spend` or `currency` absent and not supplied by approved metadata | CPM/CPC 계산과 통화 해석 불가 |
| Missing date range | `date_start` or `date_stop` absent/unparseable | recent benchmark window 판정 불가 |
| Non-numeric core metrics | `impressions` or `clicks` cannot be parsed as numeric | deterministic metric calculation 불가 |
| Missing objective | `objective` absent/unmapped | objective benchmark slicing 불가 |
| Missing optimization goal | `optimization_goal` absent/unmapped | optimization_goal benchmark slicing 불가 |
| Unsafe LLM path | campaign/ad/account/advertiser raw fields are configured for direct LLM input | raw campaign-level data boundary 위반 |
| Secret/session exposure | file or metadata contains token, API key, credential, session URL, signed URL, or authorization header | credential leakage risk |
| Recent/trend mixing | data older than 6 months is merged into default recent benchmark without `long_term_trend` separation | benchmark recency policy 위반 |
| Unknown cost basis for approval | `net_or_gross = unknown` and approval is requested | commercial metric 해석 불가 |
| Invalid date order | `date_stop` is before `date_start` | invalid reporting window |
| Negative core metrics | spend, impressions, clicks, reach are negative | invalid metric semantics |
| Duplicate hash conflict | same source hash has conflicting metadata or row count | lineage ambiguity |

Reject output에는 raw row values를 붙이지 않고, field name, row group, error type, count, remediation hint만 기록한다.

## 8. Warning Rules

Warning은 batch를 즉시 폐기하지 않지만, reviewer 승인과 report limitation 표시가 필요하다.

| Rule | Warning condition | Required handling |
| --- | --- | --- |
| Missing reach | `reach` absent or semantic confidence low | Reach/frequency calculation disabled or marked limited |
| Mixed currency | Multiple currencies detected | Split cohort or require approved exchange metadata |
| Unknown Net/Gross | `net_or_gross = unknown` | Do not approve as default benchmark until clarified |
| Mixed breakdown | age/gender/device/placement grains mixed without explicit aggregation rule | Split by grain or mark as mixed |
| Short period | reporting window is too short for stable benchmark | Mark limited; do not overstate benchmark quality |
| Low sample size | campaign_count or row_count below threshold | Require minimum sample status |
| Objective imbalance | one objective dominates sample or objective counts are highly uneven | Show sample imbalance warning |
| Optimization goal imbalance | one optimization_goal dominates or many unmapped goals exist | Show mapping/imbalance warning |
| High zero/null rate | key metric has excessive zero or null values | Review source quality |
| Metric mismatch | reported CTR/CPM/CPC differs from calculated value beyond tolerance | Store reconciliation warning |
| Long-term only | data is entirely older than recent benchmark window | Use only as long-term trend unless exception approved |
| Unconfirmed reach alias | `Unique Imps.` used as reach without owner confirmation | Keep as `reach_candidate` |

Minimum thresholds are policy values and should be finalized in implementation design. Until then, the spec recommends recording `minimum_sample_status` as `pass`, `warning`, or `not_evaluated` rather than silently accepting small samples.

## 9. Normalization Candidates

### 9.1 Field Mapping Candidates

| Source field family | Normalized field | Existing repo evidence | Rule |
| --- | --- | --- | --- |
| `매체`, `platform` | `platform` | Future metadata | Normalize to lowercase platform code. |
| `날짜`, `date`, `기간` | `date_start`, `date_stop`, `date_grain` | `xlsxLoader.ts`, docs sample inventory | Parse daily/period/campaign total separately. |
| `목표`, `objective` | `objective` | `xlsxLoader.ts`, `metaSync.ts`, Python model inputs | Map to canonical objective dimension. |
| `최적화목표`, `optimization_goal` | `optimization_goal` | `xlsxLoader.ts`, `metaSync.ts` | Map to canonical optimization goal dimension. |
| `지출금액`, `spend`, `amount_spent` | `spend` | `xlsxLoader.ts`, `metaSync.ts`, Python model features | Preserve currency and cost basis. |
| `노출`, `Imps.`, `impressions` | `impressions` | `xlsxLoader.ts`, sample inventory | Numeric count. |
| `클릭`, `Click`, `clicks` | `clicks` | sample inventory | Numeric count. |
| `도달`, `reach`, `Unique Imps.` | `reach` or `reach_candidate` | `xlsxLoader.ts`, sample inventory | Confirm semantics before approval. |
| `성별`, `gender` | `gender` | `xlsxLoader.ts`, `metaSync.ts` | Optional breakdown. |
| `연령`, `age` | `age_range` | `xlsxLoader.ts`, `metaSync.ts` | Optional breakdown. |
| `노출위치`, placement fields | `placement` | `xlsxLoader.ts`, `metaSync.ts` | Optional breakdown. |
| `소재형태`, creative fields | `creative_format` | `xlsxLoader.ts`, `metaSync.ts` | Optional breakdown. |
| `영상조회수`, `video_views` | `video_views` | `xlsxLoader.ts`, `metaSync.ts` | Optional video metric. |
| conversion action fields | `conversions` | Future analysis candidate | Optional conversion metric. |

### 9.2 Deterministic Metric Definitions

All derived metrics must be calculated by deterministic code, not by LLM.

| Metric | Definition | Zero division handling |
| --- | --- | --- |
| `cpm_calculated` | `spend / impressions * 1000` | If impressions <= 0, set null and warning |
| `cpc_calculated` | `spend / clicks` | If clicks <= 0, set null and warning |
| `ctr_ratio` | `clicks / impressions` | If impressions <= 0, set null and warning |
| `ctr_pct` | `ctr_ratio * 100` | Derived only when `ctr_ratio` exists |
| `frequency_calculated` | `impressions / reach` | If reach <= 0 or absent, set null and warning |
| `vtr_ratio` | `video_views / impressions` | Optional; if impressions <= 0, set null |
| `cpv_calculated` | `spend / video_views` | Optional; if video_views <= 0, set null |
| `conversion_rate` | `conversions / clicks` or approved denominator | Optional; denominator must be explicit |
| `cpa_calculated` | `spend / conversions` | Optional; if conversions <= 0, set null |

Do not substitute zero, fallback averages, or hardcoded defaults during upload validation. Fallbacks may exist in prediction UX, but benchmark normalization should preserve missing/invalid status explicitly.

### 9.3 Currency and Cost Basis

- `currency` must be stored as explicit metadata.
- Mixed currency rows must be split before aggregation unless an approved exchange rate policy is attached.
- MVP should not silently convert currency.
- `net_or_gross` must be preserved as `net`, `gross`, or `unknown`.
- `unknown` cost basis may remain in staging but should not be approved as default benchmark.
- `markup_policy` and `markup_rate` should be metadata, not embedded into report text as advertiser-specific commercial terms.

### 9.4 Canonical Mapping

Objective and optimization_goal mapping should produce both raw and canonical fields in staging, but only canonical or approved display labels should be used in benchmark outputs.

Candidate fields:

```text
objective_raw
objective_canonical
optimization_goal_raw
optimization_goal_canonical
mapping_status
mapping_version
mapping_warnings
```

Mapping status candidates:

- `mapped`
- `mapped_with_warning`
- `unmapped`
- `manual_review_required`

Rows with `unmapped` objective or optimization_goal cannot be approved as benchmark facts until reviewed.

### 9.5 Recent Benchmark vs Long-term Trend

Upload validation must classify each row group by date range.

| Window policy | Rule | Usage |
| --- | --- | --- |
| `recent_6_months` | date range is within the most recent 6 months from benchmark as-of date | Default prediction/benchmark candidate |
| `long_term_trend` | date range is older than recent window | Trend/seasonality reference only |
| `mixed_window` | batch spans recent and older periods | Split before approval |

Required fields:

```text
as_of_date
benchmark_window_start
benchmark_window_end
window_policy
excluded_from_default_benchmark
```

If a batch contains both recent and long-term data, the validator should require split outputs before approval.

## 10. Data Quality Report Shape

The validator should eventually produce a structured data quality report. This document does not implement it, but recommends the following shape.

```text
batch_id
source_file_hash
schema_mapping_version
row_count
accepted_row_count
rejected_row_count
warning_count
required_field_status
metadata_status
metric_reconciliation_status
window_policy_status
identifier_policy_status
llm_boundary_status
approval_status
review_required_reasons
```

The report must avoid raw row dumps. If row examples are needed for debugging, they should be shown only in a restricted reviewer view with identifier masking and no LLM forwarding.

## 11. Privacy and Security Boundary

### 11.1 Raw Campaign-level Row Preservation

Raw campaign-level rows may exist only as restricted source evidence or temporary staging input.

Required controls:

- never store raw files in the repo
- never commit raw Excel/CSV/cache/model artifacts
- store raw file path only as an internal storage reference if approved
- retain source hash and metadata for lineage
- limit raw file retention period
- restrict access to uploader/reviewer/admin roles
- mask or hash account/campaign/ad identifiers before normalized benchmark use

### 11.2 LLM-allowed Data

LLM payload may include:

- industry/objective/optimization_goal aggregate summaries
- recent benchmark median/percentile values
- sample count and date range
- deterministic metric outputs
- data quality warnings
- limitations and caveats
- anonymized trend summary

LLM payload must not include:

- raw campaign-level rows
- campaign name
- advertiser or brand name
- account id or account name
- ad/adset identifiers
- token, key, session URL, request URL with credential
- advertiser-specific contract terms
- row-level spend/click/impression series

### 11.3 Report and Recommendation Display

Planner-facing reports may display:

- aggregate benchmark values by industry/objective/date window
- sample count or sample sufficiency label
- currency and Net/Gross basis
- warning/limitation labels
- benchmark window policy
- uplift or comparison results calculated by deterministic engine

Planner-facing reports must not display:

- raw advertiser/campaign/account identifiers
- raw campaign-level row values
- unapproved cost basis assumptions
- hidden currency conversion assumptions
- LLM-inferred statistical significance

### 11.4 Uploader and Reviewer Audit

Manual upload should eventually be an audited action.

Audit candidates:

```text
upload_started
upload_validated
upload_rejected
mapping_reviewed
benchmark_approved
benchmark_revoked
raw_file_retention_expired
```

Each audit event should include actor reference, timestamp, batch reference, mapping version, approval status, and sanitized reason. It should not include secret values or raw campaign rows.

## 12. Approval Flow Candidate

Recommended MVP flow:

```text
User exports dashboard/Meta-compatible file
→ user uploads file and metadata
→ schema validation
→ metric type validation
→ metadata validation
→ identifier and LLM boundary check
→ normalization preview
→ data quality report
→ reviewer approval or rejection
→ approved normalized benchmark dataset candidate
```

Approval status:

| Status | Meaning |
| --- | --- |
| `draft` | File selected or metadata incomplete |
| `validated` | Required validation passed without reject |
| `warning` | Usable only after reviewer accepts limitations |
| `rejected` | Cannot be promoted |
| `approved` | Eligible for normalized benchmark dataset |
| `revoked` | Previously approved batch removed from use |

## 13. Current Implementation Alignment

This spec intentionally preserves the current Next.js + Python/FastAPI PoC structure.

Observed current implementation shape:

- `lib/xlsxLoader.ts` loads Supabase RPC aggregate rows into `XlsxRecord` fields such as industry, objective, optimization goal, spend, impressions, reach, CPM, CPC, video views, placement, creative, gender, age.
- `lib/predictor.ts` uses weighted CPM/CPC/CPC Link/CPV/VTR and reach/frequency calculations for planning predictions.
- `lib/regression.ts` trains Ridge/WLS-style models using industry, gender, age, month/season features and spend-weighted targets.
- `lib/metaSync.ts` maps Meta-like insights fields into legacy `ad_data` rows and includes placement and demographic breakdown paths.
- `python/data_loader.py` and `python/model.py` consume aggregate fields from Supabase RPC outputs for the Python ML service.

This document does not modify those files. It defines a safer future input contract so new upload data can be validated before it reaches those prediction paths.

## 14. Open Questions

1. What is the official dashboard export template for spend, currency, objective, optimization_goal, and hierarchy fields?
2. Should MVP require campaign-level hierarchy, or is objective/date aggregate enough when source evidence is reviewed?
3. What is the minimum campaign_count per industry/objective benchmark cohort?
4. Is `Unique Imps.` always equivalent to Meta reach in the sampled dashboard export?
5. Should Net or Gross be the default internal benchmark basis?
6. Who owns objective and optimization_goal canonical mapping review?
7. What raw file retention period is acceptable under internal security policy?
8. Which Agent Core audit table or event stream should own uploader/reviewer actions?

## 15. Follow-up Gates

### Foresight-Benchmark-4: Sample Column Mapper Design

Scope:

- define source template profiles
- define column alias registry
- define parser behavior for daily/period/campaign total reports
- define metric reconciliation tolerance
- define normalized preview shape
- still no DB migration or API automation unless separately approved

### Foresight-DB-2: Legacy DB Live Read-only Inventory Retry

Scope:

- retry metadata-only inventory with valid read-only connection
- confirm schema/table/column/RLS/index/constraint/function/storage/auth metadata
- confirm row counts without raw row output
- update migration decision matrix
- no import/export/migration

### Foresight-Security-1: Debug/Meta API Route Hardening Review

Scope:

- review `/api/debug-env`, `/api/debug-data`, `/api/py-retrain`, `/api/meta-sync`, scraping routes
- define auth, admin guard, audit log, rate limit, environment disablement requirements
- do not implement until approved

## 16. Final Recommendation

Gate Foresight-Benchmark-3 recommends the following MVP upload rule:

```text
Accept dashboard/Meta-compatible manual uploads only as source evidence.
Reject missing spend/currency/date/objective/optimization_goal/impressions/clicks.
Keep identifiers and raw rows out of LLM and report outputs.
Normalize metrics deterministically.
Split recent 6-month benchmark from long-term trend.
Promote only reviewer-approved normalized aggregates into benchmark use.
```
