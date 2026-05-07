# AdMate Foresight Benchmark Column Mapping Spec v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-4 sample column mapper design

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Foresight MVP의 benchmark 수동 업로드에서 dashboard/Meta-compatible export 컬럼을 canonical benchmark field로 매핑하는 설계를 정의한다.

이번 Gate는 설계 문서화만 수행한다. 코드, API route, DB schema, Supabase RPC, import/export, Meta API 호출은 변경하거나 실행하지 않는다.

기준 문서:

- `AdMate_Foresight_Benchmark_Data_Intake_Plan_v1.md`
- `AdMate_Foresight_Benchmark_Sample_Column_Inventory_v1.md`
- `AdMate_Foresight_Benchmark_Upload_Validation_Spec_v1.md`
- `AdMate_Foresight_Legacy_DB_Inventory_v1.md`

핵심 원칙:

```text
Source columns are evidence.
Canonical fields are validation targets.
Approved normalized benchmark dataset is the source of truth.
```

## 2. Scope and Non-scope

### 2.1 Scope

- canonical benchmark fields 정의
- dashboard/Excel/Meta-compatible export alias 후보 정의
- Meta API field 후보 정의
- 잘린 컬럼명, 빈 컬럼명, 중복 컬럼명 처리 기준 정의
- mapping confidence 상태 정의
- derived metric 계산 기준 정의
- Benchmark-3 reject/warning rule과 mapping 단계 연결
- campaign/account/ad identifiers privacy boundary 정의
- mapper output 후보 정의
- 후속 Gate 제안

### 2.2 Non-scope

- parser code implementation
- upload UI implementation
- DB table/schema/RPC migration
- live DB read/write
- Meta API direct pull
- token, env, credential handling
- raw Excel/CSV/model artifact 추가
- commit, push, PR 생성

## 3. Canonical Benchmark Fields

MVP mapper는 source column을 아래 canonical field 후보로 매핑한다. Canonical field는 staging/preview 단계의 설계 후보이며, 실제 DB schema가 아니다.

| Canonical field | Required for approval | Type candidate | Description | Source of value |
| --- | --- | --- | --- | --- |
| `platform` | Yes | text enum | 광고 플랫폼. MVP는 Meta 우선 | source column or upload metadata |
| `source_type` | Yes | text enum | `dashboard_export` or `meta_api_export` | upload metadata |
| `date_start` | Yes | date | row/group reporting start date | source column or parsed period |
| `date_stop` | Yes | date | row/group reporting end date | source column or parsed period |
| `date_grain` | Yes | text enum | daily, weekly, monthly, campaign_total, mixed | derived from source structure |
| `objective` | Yes | text | canonical campaign objective | source column plus mapping |
| `objective_raw` | Recommended | text | original objective value | source column |
| `optimization_goal` | Yes | text | canonical optimization goal | source column plus mapping |
| `optimization_goal_raw` | Recommended | text | original optimization goal value | source column |
| `spend` | Yes | numeric | spend amount in source currency and cost basis | source column |
| `currency` | Yes | text enum | KRW, USD, JPY, EUR, OTHER | source column or upload metadata |
| `net_or_gross` | Yes | text enum | net, gross, unknown | upload metadata or source column |
| `markup_policy` | Yes | text enum | included, excluded, manual_rate, unknown | upload metadata |
| `impressions` | Yes | numeric | total impressions | source column |
| `clicks` | Yes | numeric | total clicks | source column |
| `reach` | Yes for approval, warning if uncertain | numeric | unique reach | source column or confirmed alias |
| `reach_candidate` | Conditional | numeric | reach-like field pending semantic confirmation | source column |
| `frequency` | Recommended | numeric | impressions per reached user | source column or derived |
| `cpm` | Recommended | numeric | spend per 1,000 impressions | source column or derived |
| `cpc` | Recommended | numeric | spend per click | source column or derived |
| `ctr` | Recommended | numeric ratio | clicks divided by impressions | source column or derived |
| `video_views` | Optional | numeric | video view count | source column |
| `conversions` | Optional | numeric | conversion count with explicit event definition | source column |
| `account_identifier` | Review-only | text/hash | account id/name reference | restricted metadata only |
| `campaign_identifier` | Review-only | text/hash | campaign id/name reference | restricted metadata only |
| `adset_identifier` | Review-only | text/hash | adset/ad group reference | restricted metadata only |
| `ad_identifier` | Review-only | text/hash | ad/creative reference | restricted metadata only |

Approval blockers:

- `platform`, `source_type`, `date_start`, `date_stop`, `objective`, `optimization_goal`, `spend`, `currency`, `impressions`, `clicks` cannot be missing.
- `reach` may enter staging as warning, but approved benchmark usage should either confirm reach semantics or mark reach/frequency outputs unavailable.
- `net_or_gross = unknown` or `markup_policy = unknown` blocks automatic approval for default benchmark use.

## 4. Source Column Alias Registry

The mapper should use an alias registry rather than ad hoc string matching. Each alias entry should record source template, canonical field, confidence, and notes.

### 4.1 Core Dimension Aliases

| Canonical field | Korean/dashboard aliases | English/export aliases | Meta API field candidates | Notes |
| --- | --- | --- | --- | --- |
| `platform` | `매체`, `플랫폼`, `광고매체`, `미디어` | `platform`, `publisher_platform`, `media` | `publisher_platform` | If multiple values exist, preserve breakdown separately. |
| `source_type` | upload metadata | upload metadata | not a row field | Must be supplied by upload flow. |
| `date_start` | `일자`, `날짜`, `시작일`, `집행시작일`, parsed `기간` | `date_start`, `date`, `start_date`, `day` | `date_start` | One-day rows set start and stop to same date. |
| `date_stop` | `일자`, `날짜`, `종료일`, `집행종료일`, parsed `기간` | `date_stop`, `date`, `end_date`, `day` | `date_stop` | Period labels require parser confidence. |
| `objective` | `목표`, `캠페인목표`, `광고목표` | `objective`, `campaign_objective` | `objective` | Must map to canonical objective. |
| `optimization_goal` | `최적화목표`, `최적화 목표`, `입찰최적화` | `optimization_goal`, `optimization goal` | `optimization_goal` | Must map separately from objective. |

### 4.2 Core Metric Aliases

| Canonical field | Korean/dashboard aliases | English/export aliases | Meta API field candidates | Notes |
| --- | --- | --- | --- | --- |
| `spend` | `지출금액`, `지출 금액`, `광고비`, `비용`, `집행금액`, `Spend` | `spend`, `amount_spent`, `cost`, `media_cost` | `spend` | Requires currency and Net/Gross metadata. |
| `currency` | `통화`, `화폐`, `currency`, upload metadata | `currency`, `currency_code` | `account_currency` or metadata | Do not infer KRW silently. |
| `impressions` | `노출`, `노출수`, `Imps.`, `Imps`, `노출 횟수` | `impressions`, `imps`, `impression_count` | `impressions` | Numeric required. |
| `clicks` | `클릭`, `클릭수`, `Click`, `Clicks` | `clicks`, `all_clicks` | `clicks` | Numeric required. |
| `reach` | `도달`, `도달수`, `Unique Imps.`, `Unique Imps`, `순도달` | `reach`, `unique_impressions`, `unique_imps` | `reach` | `Unique Imps.` starts as `reach_candidate` until confirmed. |
| `frequency` | `빈도`, `평균빈도`, `Frequency` | `frequency`, `avg_frequency` | `frequency` | Can be derived if reach is confirmed. |
| `cpm` | `CPM`, `cpm`, `노출당비용` | `cpm`, `cost_per_1000_impressions` | `cpm` | Source value should be reconciled with derived value. |
| `cpc` | `CPC`, `cpc`, `클릭당비용` | `cpc`, `cost_per_click` | `cpc` | Source value should be reconciled with derived value. |
| `ctr` | `CTR`, `ctr`, `클릭률` | `ctr`, `click_through_rate` | `ctr` | Store source unit as ratio or percent. |

### 4.3 Optional Metric and Breakdown Aliases

| Canonical field | Korean/dashboard aliases | English/export aliases | Meta API field candidates | Notes |
| --- | --- | --- | --- | --- |
| `video_views` | `영상조회수`, `동영상조회수`, `비디오조회수`, `3초조회수` | `video_views`, `video_views_3s`, `thruplay` | `actions.video_view`, `video_plays`, `video_thruplay_watched_actions` | Event definition must be explicit. |
| `video_view_cost` | `영상조회비용`, `동영상조회비용` | `cost_per_video_view`, `cpv` | `cost_per_action_type.video_view` | Optional cost metric. |
| `conversions` | `전환`, `전환수`, `구매`, `리드` | `conversions`, `purchases`, `leads`, `actions` | `actions`, `conversions` | Conversion event type must be explicit. |
| `age_range` | `연령`, `나이`, `연령대` | `age`, `age_range` | `age` breakdown | Optional breakdown. |
| `gender` | `성별` | `gender` | `gender` breakdown | Optional breakdown. |
| `placement` | `노출위치`, `게재위치`, `지면`, `플레이스먼트` | `placement`, `platform_position`, `publisher_platform` | `publisher_platform`, `platform_position` | Multiple placement fields may combine into canonical placement. |
| `device` | `기기`, `디바이스`, `노출기기` | `device`, `impression_device` | `impression_device` | Optional breakdown. |
| `creative_format` | `소재형태`, `소재 형식`, `광고형식` | `creative_format`, `object_type`, `ad_format` | creative object type fields | Optional breakdown. |
| `industry` | `업종`, `카테고리`, `산업군` | `industry`, `vertical`, `category` | not a standard insights field | Prefer taxonomy mapping over campaign-name parsing. |

### 4.4 Identifier Aliases

| Identifier group | Korean/dashboard aliases | English/export aliases | Meta API field candidates | Mapping policy |
| --- | --- | --- | --- | --- |
| Account | `계정ID`, `광고계정ID`, `계정명`, `광고계정명` | `account_id`, `account_name`, `ad_account_id` | `account_id`, `account_name` | Restricted review-only metadata. |
| Campaign | `캠페인ID`, `캠페인이름`, `캠페인명` | `campaign_id`, `campaign_name` | `campaign_id`, `campaign_name` | Restricted review-only metadata. |
| Adset / ad group | `광고세트ID`, `광고세트명`, `광고그룹ID`, `광고그룹명` | `adset_id`, `adset_name`, `ad_group_id`, `ad_group_name` | `adset_id`, `adset_name` | Restricted review-only metadata. |
| Ad / creative | `광고ID`, `광고명`, `소재ID`, `소재명` | `ad_id`, `ad_name`, `creative_id`, `creative_name` | `ad_id`, `ad_name`, `creative.id` | Restricted review-only metadata. |
| Advertiser / brand | `광고주`, `브랜드`, `클라이언트` | `advertiser`, `brand`, `client` | not required for benchmark | Mask or hold from normalized benchmark. |

Identifiers must not be included in LLM or report payloads as raw strings.

## 5. Truncated, Empty, and Duplicate Column Handling

Dashboard Excel exports may include layout artifacts, blank spacer columns, duplicated headers, or shortened labels. Mapper behavior should be deterministic and auditable.

### 5.1 Empty or Layout Columns

Examples:

- `column_1`
- `column_3`
- blank header
- merged-cell spacer columns

Rule:

- map to `ignored_layout_column`
- record in `rejected_columns` with reason `empty_or_layout_artifact`
- do not treat as data quality failure unless required fields are missing

### 5.2 Truncated Column Names

Examples:

- `Imps.` for impressions
- `Unique Imps.` for reach-like metric
- `Opt. Goal` for optimization_goal
- `Amt. Spent` for spend

Rule:

- match through alias registry only
- assign confidence `alias`
- require semantic notes for ambiguous fields
- use `reach_candidate` for `Unique Imps.` until owner confirms it equals Meta reach

### 5.3 Duplicate Column Names

Duplicate headers can occur when multiple sheets or grouped reports flatten into one table.

Rule:

1. Preserve original column order and sheet name.
2. Rename internal copies with stable suffixes, for example `CTR__1`, `CTR__2`.
3. If duplicates have identical parsed values, keep one accepted mapping and mark others `duplicate_same_values`.
4. If duplicates differ, set mapping confidence to `rejected` for that canonical field until reviewer resolves.
5. Never merge duplicate metric columns by summing or averaging without an explicit aggregation rule.

### 5.4 Header Row Detection

Sample inventory found dashboard headers after top metadata rows. Mapper design should support header detection without storing raw row values in docs.

Candidate rules:

- detect row with highest count of known aliases
- ignore top title/metadata rows as source metadata candidates
- require reviewer confirmation when multiple header rows tie
- record `header_row_index`, `sheet_name`, and `header_detection_confidence`

## 6. Mapping Confidence

Each source-to-canonical mapping should receive one confidence status.

| Confidence | Meaning | Example | Approval impact |
| --- | --- | --- | --- |
| `exact` | Source column exactly matches canonical field or approved canonical label | `impressions` -> `impressions`, `목표` -> `objective` when template approved | Accept if type validation passes |
| `alias` | Source column matches known alias | `Imps.` -> `impressions`, `Click` -> `clicks` | Accept with alias record |
| `derived` | Field is calculated from accepted fields | `cpm = spend / impressions * 1000` | Accept if inputs valid |
| `missing` | Required/expected field absent | no `currency` column/metadata | Trigger reject or warning |
| `rejected` | Field exists but cannot be trusted or is unsafe | duplicate conflicting CTR, token-like field, campaign name as LLM input | Block relevant use |

Recommended mapping record:

```text
source_column
source_sheet
canonical_field
mapping_confidence
mapping_reason
source_type
parser_profile
value_type_status
review_required
```

## 7. Derived Metric Rules

Derived metrics must be calculated deterministically. LLM must not calculate or override them.

| Canonical metric | Formula | Required inputs | Zero division handling |
| --- | --- | --- | --- |
| `cpm` | `spend / impressions * 1000` | spend, impressions | if impressions <= 0, set null and warning |
| `cpc` | `spend / clicks` | spend, clicks | if clicks <= 0, set null and warning |
| `ctr` | `clicks / impressions` | clicks, impressions | if impressions <= 0, set null and warning |
| `frequency` | `impressions / reach` | impressions, reach | if reach <= 0 or reach unconfirmed, set null and warning |

Rules:

- If source provides reported CPM/CPC/CTR/frequency, preserve as `*_reported`.
- Always calculate deterministic `*_calculated` when inputs are valid.
- Compare reported and calculated metrics using a future tolerance value.
- If mismatch exceeds tolerance, keep both values and set `metric_reconciliation_status = mismatch`.
- Do not replace invalid values with UI fallback defaults at mapping stage.
- Use null plus warning for invalid derived metrics, not zero.

### 7.1 Unit Handling

CTR may appear as percent or ratio.

| Source pattern | Candidate interpretation | Required handling |
| --- | --- | --- |
| `0.0123` | ratio | store `ctr_ratio = 0.0123`, `ctr_pct = 1.23` |
| `1.23%` | percent | parse to `ctr_ratio = 0.0123`, keep source display |
| `1.23` with `%` column metadata | percent | parse as percent |
| `1.23` without metadata | ambiguous | warning and reviewer confirmation |

Currency and Net/Gross:

- if `currency` is missing, reject
- if multiple currencies are present, split before aggregation or reject default benchmark use
- if `net_or_gross` is unknown, warn and block automatic approval
- if markup policy is unknown, warn and block automatic approval for commercial benchmark use

## 8. Reject and Warning Connections

Benchmark-3 validation rules should be applied at mapping time as early as possible.

### 8.1 Mapping-stage Rejects

| Trigger at mapping stage | Benchmark-3 rule | Mapper output |
| --- | --- | --- |
| `spend` missing or unmapped | Missing spend/currency | `rejected_columns`, `missing_required_fields`, `approval_status = rejected` |
| `currency` missing from columns and metadata | Missing spend/currency | `missing_required_fields`, `approval_status = rejected` |
| date fields absent or period unparseable | Missing date range | `date_parse_status = rejected` |
| `impressions` or `clicks` non-numeric | Non-numeric core metrics | `type_errors`, `approval_status = rejected` |
| objective absent or unmapped | Missing objective | `mapping_confidence = missing`, `approval_status = rejected` |
| optimization_goal absent or unmapped | Missing optimization goal | `mapping_confidence = missing`, `approval_status = rejected` |
| raw identifier configured as LLM/report field | Unsafe LLM path | `privacy_errors`, `approval_status = rejected` |
| token/session/auth-like column detected | Secret/session exposure | `security_errors`, `approval_status = rejected` |
| recent and long-term windows mixed without split | Recent/trend mixing | `window_policy_status = rejected` |

Reject details should not include raw row values.

### 8.2 Mapping-stage Warnings

| Trigger at mapping stage | Benchmark-3 warning | Mapper output |
| --- | --- | --- |
| reach absent | Missing reach | `warnings`, `derived_fields.frequency = unavailable` |
| `Unique Imps.` mapped to reach-like field | Unconfirmed reach alias | `reach_candidate`, reviewer note required |
| multiple currency values | Mixed currency | `warnings`, split required |
| Net/Gross unknown | Unknown Net/Gross | `warnings`, auto approval blocked |
| mixed age/gender/device/placement grain | Mixed breakdown | `breakdown_status = mixed` |
| narrow date window | Short period | `warnings`, limitation required |
| low campaign_count/row_count | Low sample size | `minimum_sample_status = warning` |
| uneven objective counts | Objective imbalance | `sample_balance_warnings` |
| reported vs calculated metric mismatch | Metric mismatch | `metric_reconciliation_status = mismatch` |

Warnings may allow `validated` status but require reviewer approval before `approved`.

## 9. Privacy Boundary

### 9.1 Raw Zone vs Canonical Zone

Mapper output should conceptually separate raw/review-only fields from canonical benchmark fields.

| Zone | Contents | Access | LLM/report eligibility |
| --- | --- | --- | --- |
| raw zone | original file, raw row values, raw identifiers | restricted uploader/reviewer/admin | never |
| review-only metadata | source hash, sheet name, header row, masked identifiers, reviewer notes | reviewer/admin | limited summary only |
| canonical benchmark preview | mapped dimensions, metrics, warnings, derived fields | reviewer/admin, later planner-safe subset | aggregate only |
| LLM/report payload | aggregate canonical summaries and limitations | planner/report layer | yes, if anonymized and aggregated |

### 9.2 Identifier Rules

- campaign/account/ad identifiers are not canonical benchmark dimensions by default.
- raw campaign/account/ad fields stay in raw zone or review-only metadata.
- advertiser name, account name, campaign name, ad name should be masked or held from normalized benchmark.
- campaign name parsing for industry should be treated as low-confidence legacy fallback, not a primary mapping strategy.
- normalized benchmark may include `campaign_count`, `row_count`, `account_scope_hash`, or approved taxonomy values.

### 9.3 LLM and Report Rules

LLM/report may receive:

- platform
- source_type
- industry/objective/optimization_goal aggregates
- date window
- sample count
- currency and Net/Gross basis labels
- calculated metric summaries
- warnings and limitations

LLM/report must not receive:

- raw campaign-level rows
- advertiser name
- account id/name
- campaign id/name
- adset/ad id/name
- ad/creative id/name
- token, credential, session URL, request URL with secret
- advertiser-specific contract terms

## 10. Mapper Output Candidate

The mapper should eventually produce a structured report. This is a design candidate, not an implementation.

### 10.1 `mapping_report`

```text
mapping_report
  batch_reference
  parser_profile
  source_type
  source_file_hash
  sheet_reports
  header_detection_status
  canonical_field_status
  mapping_confidence_summary
  metric_reconciliation_status
  privacy_boundary_status
  validation_status
  approval_status
```

### 10.2 `accepted_columns`

```text
accepted_columns[]
  source_sheet
  source_column
  normalized_source_column
  canonical_field
  mapping_confidence
  source_value_type
  parsed_value_type
  required_field
```

### 10.3 `rejected_columns`

```text
rejected_columns[]
  source_sheet
  source_column
  reason_code
  severity
  reviewer_action_required
```

Reason code candidates:

- `empty_or_layout_artifact`
- `duplicate_conflict`
- `unsafe_identifier_for_output`
- `secret_or_session_like`
- `unknown_semantics`
- `invalid_type`
- `unsupported_metric`

### 10.4 `warnings`

```text
warnings[]
  code
  severity
  affected_field
  affected_row_count
  message
  required_reviewer_decision
```

### 10.5 `derived_fields`

```text
derived_fields[]
  canonical_field
  formula
  input_fields
  output_status
  zero_division_status
  reconciliation_status
```

### 10.6 `reviewer_notes`

```text
reviewer_notes[]
  reviewer_reference
  field_or_issue
  decision
  reason
  created_at
```

Reviewer notes must not include raw row dumps or secret values.

## 11. Source Template Profiles

Mapper behavior should be profile-based because dashboard exports and Meta-compatible exports have different shapes.

| Profile | Expected structure | Current confidence | Notes |
| --- | --- | --- | --- |
| `dashboard_daily_execution_report` | header after top metadata rows, date row grain, `Imps.`, `Click`, `CTR`, `Unique Imps.` | partial | Useful as narrow parser fixture, insufficient for benchmark approval alone. |
| `dashboard_basic_execution_report` | period row grain, unlabeled text columns, `Imps.`, `Click`, `CTR`, `Unique Imps.` | partial | Needs owner confirmation for unlabeled columns. |
| `meta_ads_manager_full_export` | campaign/adset/ad hierarchy, objective, optimization_goal, spend, currency, impressions, clicks, reach | target | Recommended MVP source if manually exported. |
| `meta_compatible_internal_full_export` | internal dashboard full export with required metadata and metrics | target | Can be MVP source if template is approved. |

Each profile should define:

```text
profile_id
source_type
expected_sheet_names
header_detection_rule
required_aliases
optional_aliases
identifier_columns
default_breakdown_grain
known_limitations
review_required_fields
```

## 12. Current Implementation Alignment

This mapper spec preserves the current PoC implementation.

Read-only findings from current code:

- `lib/xlsxLoader.ts` expects legacy aggregate fields such as `업종`, `목표`, `최적화목표`, `노출위치`, `소재형태`, `성별`, `연령`, `도달`, `노출`, `지출금액`, `빈도`, `CPM`, `CPC`, `CPC링크`, `영상조회수`, `영상조회비용`, and `날짜`.
- `lib/predictor.ts` uses weighted CPM, weighted CPC, weighted frequency, VTR, CPV, and reach calculations for prediction and benchmark comparison.
- `lib/regression.ts` trains CPM/CPC/VTR models with spend-weighted records and categorical dimensions.
- `python/data_loader.py` consumes `get_monthly_aggregates` and `get_demographic_aggregates` outputs with aggregate metric names such as `avg_cpm`, `avg_cpc`, `sum_도달`, `sum_노출`, and `sum_지출금액`.

The mapper should validate and normalize future upload data before it can feed any equivalent prediction or benchmark path.

## 13. Open Questions

1. Which exact dashboard export template will be used for MVP approval?
2. What are the official canonical values for objective and optimization_goal?
3. Should `Unique Imps.` be accepted as reach after owner confirmation, or remain separate forever?
4. What tolerance should be used for reported vs calculated CPM/CPC/CTR mismatch?
5. What minimum sample size is required by industry/objective/optimization_goal cohort?
6. Which identifier hash and retention policy will Agent Core own?
7. Should source files with mixed breakdowns be split automatically in a future parser, or always require reviewer split?
8. Should Meta Ads Manager manual export be the preferred MVP template over internal dashboard export?

## 14. Follow-up Gates

### Foresight-Benchmark-5: Upload Parser Dry-run Harness Design

Scope:

- design a dry-run harness that reads approved fixture metadata and column headers
- no raw campaign row persistence in repo
- no DB import/export
- no Meta API call
- define expected `mapping_report` snapshots
- define parser profile test cases

### Foresight-Security-1: Debug/Meta API Route Hardening Review

Scope:

- review debug, retrain, sync, and scraping routes
- define auth guard, admin allowlist, rate limit, audit log, and production disablement requirements
- no implementation until separately approved

### Foresight-DB-2: Legacy DB Live Read-only Inventory Retry

Scope:

- retry metadata-only legacy DB inventory with a valid read-only path
- inspect schema/table/column/RLS/index/function/storage/auth metadata
- count rows without raw row output
- no import/export/migration

## 15. Final Recommendation

Gate Foresight-Benchmark-4 recommends a profile-based mapper:

```text
1. Map source columns to canonical fields through an alias registry.
2. Assign every mapping a confidence value: exact, alias, derived, missing, or rejected.
3. Derive CPM/CPC/CTR/frequency only from validated numeric inputs.
4. Treat campaign/account/ad identifiers as raw zone or review-only metadata.
5. Connect mapping failures directly to Benchmark-3 reject/warning rules.
6. Output a mapping_report for reviewer approval before benchmark promotion.
```
