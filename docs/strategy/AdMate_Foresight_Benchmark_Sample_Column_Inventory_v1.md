# AdMate Foresight Benchmark Sample Column Inventory v1

작성일: 2026-05-06

문서 상태: Gate Foresight-Benchmark-2 sample column inventory 초안

## 1. Purpose

이 문서는 Gate Foresight-Benchmark-1에서 정의한 Meta benchmark data intake 설계를 실제 dashboard export 샘플 관점에서 점검하기 위한 1차 column/metric inventory다.

이번 단계의 목표는 기능 구현이 아니라 샘플 파일의 컬럼, 타입, nullable, metric 후보, breakdown 가능 여부, metadata 보존 가능성을 확인하는 것이다.

이번 문서는 다음 원칙을 따른다.

- 코드, API, DB schema, env는 변경하지 않는다.
- 실제 Meta API 호출은 하지 않는다.
- DB import는 하지 않는다.
- raw campaign-level row 전체를 문서에 붙이지 않는다.
- 샘플 row 값은 원문 대신 익명화된 형태와 값 유형만 기록한다.
- hardcoded token 또는 script를 읽더라도 token 값은 출력하지 않는다.
- secret, API key, token, credential, env 값은 기록하지 않는다.

## 2. Sample Acquisition Status

### 2.1 확보된 샘플

로컬 다운로드 경로에서 dashboard export로 보이는 Excel 샘플 2개를 read-only, macro-disabled 방식으로 열어 구조만 확인했다.

| Label | Workbook type | Sheet | Rows | Columns | Usage in this inventory |
| --- | --- | --- | ---: | ---: | --- |
| sample_daily_execution_report | dashboard Excel export | `집행리포트_일자별` | 18 | 7 | Primary sample for date breakdown inventory |
| sample_basic_execution_report | dashboard Excel export | `집행리포트` | 81 | 8 | Companion sample for period/campaign-level aggregate inventory |

원본 파일은 repo에 추가하지 않았다. 본 문서에도 campaign, advertiser, account, row-level values 원문은 기록하지 않는다.

### 2.2 Reference Script Status

요청 참고 파일 `C:/Users/Administrator/Documents/UCWORKS/UCWORKS Download Files/이노코.py`는 지정 경로에서 확인되지 않았다. 해당 폴더에는 읽을 수 있는 파일이 없어 token 또는 script 내용을 검토하지 못했다.

후속으로 script가 제공되면 다음 방식으로만 검토한다.

- token 값은 출력하지 않는다.
- API endpoint, field list, breakdown, paging, date range 처리 방식만 요약한다.
- hardcoded token 존재 여부는 값 없이 `present/absent`로만 기록한다.
- token rotation, app secret proof, permission scope, storage 위치를 별도 risk로 분리한다.

## 3. Sample Level Assessment

### 3.1 Level 판단

현재 확보된 dashboard export 샘플은 Meta Ads Manager의 full raw export라기보다 운영 dashboard에서 내려받은 집계 리포트에 가깝다.

| Level / breakdown | sample_daily_execution_report | sample_basic_execution_report | Notes |
| --- | --- | --- | --- |
| account level | Not detected | Not detected | account id/name 컬럼이 구조화되어 있지 않음 |
| campaign level | Metadata detected | Metadata detected | campaign 관련 metadata가 workbook 내부에 있으나 structured column은 아님 |
| adset level | Not detected | Not detected | adset/ad set 컬럼 없음 |
| ad level | Not detected | Not detected | ad/creative 컬럼 없음 |
| date breakdown | Detected | Period detected | daily sample은 `일자`, basic sample은 `기간` 중심 |
| age breakdown | Not detected | Not detected | 연령 컬럼 없음 |
| gender breakdown | Not detected | Not detected | 성별 컬럼 없음 |
| objective | Not detected | Not detected | objective 컬럼 또는 metadata 없음 |
| optimization_goal | Not detected | Not detected | optimization goal 컬럼 또는 metadata 없음 |

### 3.2 Benchmark 적합성 판단

현재 샘플은 날짜별 노출, 클릭, CTR, unique impressions 중심의 집계 리포트다. Foresight 예측/분석 benchmark에 필요한 spend, currency, CPM, CPC, objective, optimization_goal, breakdown metadata가 부족하다.

따라서 이 샘플은 다음 용도로는 사용할 수 있다.

- dashboard export 구조 파악
- 일자별 impressions/clicks/CTR/reach-like field inventory
- 기존 운영 리포트와 normalized benchmark schema 간 mapping 초안 작성
- 수동 업로드 MVP에서 field validation 실패/보완 규칙 설계

그러나 다음 용도로는 단독 사용이 어렵다.

- CPM/CPC/CPP benchmark 산출
- Net/Gross, currency, markup 보정
- objective/optimization_goal별 benchmark
- account/campaign/adset/ad level cohort 분석
- actions/action_values/cost_per_action_type 기반 conversion benchmark

## 4. Primary Sample Column Inventory

Primary sample: `sample_daily_execution_report`

Sheet: `집행리포트_일자별`

Header row detected: row 11

Data row count after header: 7

| Source column | Inferred type | Non-null | Null | Candidate normalized field | Metric / dimension role | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| `column_1` | empty/spacer | 0 | 7 | ignore | none | Excel layout artifact로 판단 |
| `일자` | text date candidate | 7 | 0 | `date_start`, `date_stop` | date breakdown | date parsing rule 필요 |
| `column_3` | empty/spacer | 0 | 7 | ignore | none | Excel layout artifact로 판단 |
| `Imps.` | numeric | 7 | 0 | `impressions` | metric | Meta `impressions` 후보 |
| `Click` | numeric | 7 | 0 | `clicks` | metric | Meta `clicks` 후보 |
| `CTR` | percent/ratio | 7 | 0 | `ctr_reported` | derived metric | deterministic 재계산 값과 reconciliation 필요 |
| `Unique Imps.` | numeric | 7 | 0 | `reach_candidate` | reach-like metric | Meta `reach`와 의미 동일 여부 확인 필요 |

### 4.1 Anonymized Sample Pattern

원문 row 값은 기록하지 않는다. 구조 확인용 익명화 pattern은 아래와 같다.

| `일자` | `Imps.` | `Click` | `CTR` | `Unique Imps.` |
| --- | ---: | ---: | ---: | ---: |
| `YYYY-MM-DD` or date-like text | integer count | integer count | percent/ratio | integer count |

## 5. Companion Sample Column Inventory

Companion sample: `sample_basic_execution_report`

Sheet: `집행리포트`

Header row detected: row 7

Data row count after header: 74

| Source column | Inferred type | Non-null | Null | Candidate normalized field | Metric / dimension role | Notes |
| --- | --- | ---: | ---: | --- | --- | --- |
| `column_1` | empty/spacer | 0 | 74 | ignore | none | Excel layout artifact로 판단 |
| `기간` | text period | 73 | 1 | `date_range_label` or parsed `date_start`/`date_stop` | period dimension | parsing rule 필요 |
| `column_3` | text | 71 | 3 | pending | unlabeled dimension | 원문 값 미기재. sample owner 확인 필요 |
| `column_4` | text | 71 | 3 | pending | unlabeled dimension | 원문 값 미기재. sample owner 확인 필요 |
| `Imps.` | numeric | 72 | 2 | `impressions` | metric | Meta `impressions` 후보 |
| `Click` | numeric | 72 | 2 | `clicks` | metric | Meta `clicks` 후보 |
| `CTR` | percent/ratio | 72 | 2 | `ctr_reported` | derived metric | deterministic 재계산 값과 reconciliation 필요 |
| `Unique Imps.` | numeric | 72 | 2 | `reach_candidate` | reach-like metric | Meta `reach`와 의미 동일 여부 확인 필요 |

## 6. Required Field Coverage

Foresight benchmark에 필요한 핵심 필드 대비 현재 샘플 coverage는 아래와 같다.

| Required field family | Expected normalized fields | Current sample status | Decision |
| --- | --- | --- | --- |
| date range | `date_start`, `date_stop`, `date_grain` | Partial | daily/period parsing 가능하나 canonical range metadata 없음 |
| account | `account_id_hash`, `account_name_hash` | Missing | full benchmark source에서는 필수 |
| campaign | `campaign_id_hash`, `campaign_name_hash` | Metadata only | 현재 샘플에서는 column화되어 있지 않음 |
| adset | `adset_id_hash`, `adset_name_hash` | Missing | 후속 full export 필요 |
| ad | `ad_id_hash`, `ad_name_hash` | Missing | 후속 full export 필요 |
| objective | `objective` | Missing | benchmark slicing에 필수 |
| optimization goal | `optimization_goal` | Missing | benchmark slicing에 필수 |
| breakdown age | `age` | Missing | optional breakdown |
| breakdown gender | `gender` | Missing | optional breakdown |
| impressions | `impressions` | Present | 사용 가능 |
| clicks | `clicks` | Present | 사용 가능 |
| reach | `reach` | Candidate only | `Unique Imps.` 의미 확인 필요 |
| frequency | `frequency` | Missing | reach가 확정되면 deterministic 계산 가능 |
| spend | `spend_net`, `spend_gross`, `spend_source` | Missing | CPM/CPC 산출 blocker |
| CPM | `cpm_reported`, `cpm_calculated` | Missing | spend 없으면 산출 불가 |
| CPC | `cpc_reported`, `cpc_calculated` | Missing | spend 없으면 산출 불가 |
| CPP | `cpp_reported`, `cpp_calculated` | Missing | spend/reach 없으면 산출 불가 |
| actions | `actions_json` or normalized action rows | Missing | conversion benchmark 불가 |
| action values | `action_values_json` or normalized action rows | Missing | value benchmark 불가 |
| cost per action type | `cost_per_action_type_json` | Missing | conversion efficiency benchmark 불가 |
| currency | `currency` | Missing | spend normalization blocker |
| Net/Gross | `cost_basis` | Candidate only in companion sample | structured column 아님. false positive 가능성 있어 owner 확인 필요 |
| markup | `markup_rate`, `markup_policy_id` | Missing | gross/net reconciliation 불가 |

## 7. Metric Definition Candidates

현재 샘플에서 정의 가능한 metric 후보는 제한적이다.

| Metric | Source candidate | Deterministic definition | Status |
| --- | --- | --- | --- |
| impressions | `Imps.` | source numeric count | usable |
| clicks | `Click` | source numeric count | usable |
| ctr_reported | `CTR` | source percent/ratio | usable as reported field |
| ctr_calculated | `clicks / impressions` | deterministic calculation when impressions > 0 | can be derived |
| reach_candidate | `Unique Imps.` | source numeric count | semantic confirmation required |
| frequency | `impressions / reach` | derive only if `Unique Imps.` is confirmed as reach | blocked pending confirmation |
| cpm | `spend / impressions * 1000` | deterministic calculation | blocked because spend missing |
| cpc | `spend / clicks` | deterministic calculation | blocked because spend missing |
| cpp | `spend / reach` | deterministic calculation | blocked because spend/reach missing or uncertain |

CTR는 source 값만 신뢰하지 않고 deterministic 재계산값과 비교해야 한다. 차이가 임계값을 넘으면 `metric_reconciliation_status = mismatch`로 처리한다.

## 8. Metadata Findings

### 8.1 Net/Gross

현재 샘플에는 Net/Gross를 안정적으로 column화한 필드가 없다.

Companion sample에서 Net/Gross 관련 후보 text가 감지되었으나, structured field인지 campaign metadata text인지 확정할 수 없다. 실제 benchmark intake에서는 다음 기준을 요구한다.

- `cost_basis`: `net`, `gross`, `unknown` 중 하나
- `cost_basis_source`: dashboard column, upload metadata, API field, manual override 중 하나
- `gross_to_net_rule`: known markup, media fee rule, unknown 중 하나

`unknown` 상태의 spend는 CPM/CPC benchmark 산출에 사용하지 않거나 별도 cohort로 분리한다.

### 8.2 Currency

현재 샘플에는 currency metadata가 없다.

MVP upload template에서는 `currency`를 필수 metadata로 요구해야 한다. 기본값을 암묵적으로 KRW로 두지 않는다.

필수 후보 값:

- `KRW`
- `USD`
- `JPY`
- `EUR`
- `OTHER`

### 8.3 Markup

현재 샘플에는 markup metadata가 없다.

Markup은 다음 중 하나로 분리 보존한다.

- source에 포함된 gross spend
- source에 포함된 net spend
- upload metadata로 입력된 markup rate
- 별도 계약/수수료 rule id

계약 단가나 advertiser-specific commercial term은 LLM payload에 포함하지 않는다.

### 8.4 Date Range

Daily sample은 `일자`가 있어 date breakdown이 가능하다.

Basic sample은 `기간`이 있어 period parsing 후보가 있으나, canonical `date_start`/`date_stop` 필드는 없다.

MVP에서는 다음을 분리한다.

- row-level `date_start`, `date_stop`
- file-level `source_date_start`, `source_date_stop`
- upload-level `reporting_window_label`
- `date_grain`: `daily`, `weekly`, `monthly`, `campaign_total`, `unknown`

### 8.5 Breakdown

현재 샘플에서 확인된 breakdown은 date/period뿐이다.

아래 breakdown은 현재 샘플에 없다.

- account
- objective
- optimization_goal
- age
- gender
- placement
- device
- country/region
- campaign/adset/ad hierarchy

## 9. Normalized Schema Impact

Gate Foresight-Benchmark-1에서 제안한 normalized benchmark schema에 대해, 이번 샘플은 `benchmark_fact_aggregate` 일부 필드만 채울 수 있다.

### 9.1 Fillable from Current Sample

| Normalized field | Fillability | Source |
| --- | --- | --- |
| `source_system` | yes | manual upload metadata |
| `source_file_hash` | yes | ingestion-time hash |
| `source_sheet_name` | yes | workbook sheet name |
| `date_start` | partial | `일자` or parsed `기간` |
| `date_stop` | partial | `일자` or parsed `기간` |
| `date_grain` | partial | sheet/report type |
| `impressions` | yes | `Imps.` |
| `clicks` | yes | `Click` |
| `ctr_reported` | yes | `CTR` |
| `ctr_calculated` | yes | deterministic calculation |
| `reach_candidate` | partial | `Unique Imps.` |
| `schema_mapping_version` | yes | intake mapping version |
| `data_quality_status` | yes | validation result |

### 9.2 Not Fillable from Current Sample

| Normalized field group | Missing fields |
| --- | --- |
| identity | `account_id_hash`, `campaign_id_hash`, `adset_id_hash`, `ad_id_hash` |
| objective | `objective`, `optimization_goal`, `buying_type` |
| cost | `currency`, `cost_basis`, `spend_net`, `spend_gross`, `markup_rate` |
| efficiency | `cpm_reported`, `cpc_reported`, `cpp_reported`, deterministic CPM/CPC/CPP inputs |
| conversion | `actions`, `action_values`, `cost_per_action_type`, conversion event mapping |
| breakdown | `age`, `gender`, `placement`, `device`, `region` |

## 10. MVP Source Re-assessment

### 10.1 Excel Upload as MVP

Excel upload remains the recommended MVP path, but not with the current narrow dashboard export format alone.

Recommended MVP source:

- Meta Ads Manager export or internal dashboard export that includes spend, currency, objective, optimization_goal, date range, and campaign hierarchy
- Manual upload with required metadata form
- Deterministic parser/mapping profile per export type
- No direct Meta API token handling in MVP

Current dashboard export samples can be used as a limited parser fixture for:

- date/period parsing
- impressions/clicks/CTR/reach-like field mapping
- data quality error messaging when required benchmark fields are absent

### 10.2 API Pull as Follow-up

Meta API direct pull remains follow-up rather than MVP default.

Reasons:

- token lifecycle and rotation policy required
- permission scope review required
- app secret proof and API version policy required
- rate limit, paging, retry, partial failure handling required
- account/business id exposure risk
- audit log and internal guard required for high-cost sync

API pull should be used only after upload-based schema and metric reconciliation rules are stable.

## 11. Security Notes

### 11.1 Raw Data Boundary

샘플 workbook의 raw row values는 문서에 저장하지 않는다.

LLM layer에 전달 가능한 정보는 아래로 제한한다.

- column names
- inferred type
- nullable count
- metric coverage summary
- anonymized sample pattern
- validation error summary

LLM layer에 전달하면 안 되는 정보:

- advertiser name
- campaign name
- account id
- adset/ad id
- row-level daily performance values
- budget/spend values
- contract/markup details
- token/API key/env values

### 11.2 Hardcoded Token / Script Risk

참고 script가 후속으로 제공되면 hardcoded token 위험을 별도 점검해야 한다.

Known risks:

- source code에 access token 직접 저장
- token 값을 console output 또는 error log에 출력
- URL query string에 token 포함
- 장기 token rotation 미정
- app secret proof 미사용
- business/account id를 raw log에 출력
- API response payload를 raw file로 저장

Required controls:

- token은 env/secret manager에서만 로드
- token value, prefix, length 출력 금지
- rotation 주기와 owner 지정
- sync route internal guard 적용
- sanitized logging only
- raw API response는 repo에 저장 금지

## 12. Data Quality Rules for Benchmark-3

Benchmark-3에서 parser/mapping 설계로 넘어가기 전 아래 rule을 확정해야 한다.

| Rule | Requirement |
| --- | --- |
| required columns | impressions, clicks, spend, currency, date range, objective or optimization_goal 중 MVP 필수 조합 정의 |
| metric reconciliation | reported CTR/CPM/CPC와 calculated value 비교 tolerance 정의 |
| missing spend | spend가 없으면 CPM/CPC benchmark cohort 제외 |
| missing currency | upload metadata로 보완하지 않으면 reject |
| missing cost basis | `unknown` cohort로 격리하거나 reject |
| date parsing | `daily`, `period`, `campaign_total`별 parser rule 정의 |
| reach semantics | `Unique Imps.`가 Meta reach와 같은지 owner 확인 |
| hierarchy level | account/campaign/adset/ad level 중 최소 campaign level 요구 여부 결정 |
| breakdown cardinality | age/gender/date/objective/optimization_goal 조합의 minimum sample size 기준 정의 |

## 13. Open Questions

1. 현재 dashboard export의 `Unique Imps.`는 Meta `reach`와 같은 정의인가?
2. `집행리포트`의 unlabeled text columns는 campaign, media, placement, product 중 무엇인가?
3. dashboard export에서 spend/currency/objective/optimization_goal을 포함하는 다른 export option이 있는가?
4. Net/Gross는 dashboard에 표시되는가, 아니면 별도 계약/정산 데이터에서만 관리되는가?
5. upload MVP에서 advertiser/campaign names를 hash 처리할 기준 salt와 scope는 Agent Core가 제공하는가?
6. 최근 6개월 benchmark 샘플을 확보할 수 있는 source는 dashboard export인가, Meta Ads Manager export인가, 내부 DW인가?

## 14. Recommendation

이번 샘플 기준으로는 기존 dashboard Excel export를 Foresight benchmark MVP의 단독 source of truth로 삼기 어렵다.

권장 방향은 아래와 같다.

1. MVP source는 manual upload로 유지한다.
2. 단, upload 파일은 현재 dashboard export보다 풍부한 Meta Ads Manager export 또는 내부 dashboard full export를 요구한다.
3. 현재 `집행_*` dashboard 샘플은 narrow parser fixture와 validation failure case로 사용한다.
4. spend, currency, Net/Gross, objective, optimization_goal, hierarchy metadata가 포함된 sample file 1개를 추가 확보한다.
5. API 자동화는 token rotation, guard, logging, rate limit, audit policy 확정 후 후속 phase로 둔다.

따라서 Benchmark-2의 결론은 다음과 같다.

> Current dashboard export samples are useful for field-shape discovery, but insufficient as the benchmark source of truth. The MVP should use manual upload with a richer Meta-compatible export schema, while the sampled dashboard exports become limited compatibility fixtures.
