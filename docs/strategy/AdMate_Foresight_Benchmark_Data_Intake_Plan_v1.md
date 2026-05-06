# AdMate Foresight Benchmark Data Intake Plan v1

작성일: 2026-05-06
문서 상태: Gate Foresight-Benchmark-1 설계 초안
대상 repo: `D:\Projects\AdMate Foresight`

## 1. Purpose

이 문서는 AdMate Foresight가 Meta 중심 benchmark 데이터를 안전하게 수집, 정규화, 보존, 활용하기 위한 intake 설계를 정의한다.

Foresight benchmark 데이터는 다음 기능의 기반이다.

- 캠페인 조건 기반 CPM, CPC, CTR, Reach 예측
- 업종/목표/타겟별 벤치마크 비교
- 예산별 도달 및 효율 시뮬레이션
- A/B 캠페인 비교와 전후 성과 분석
- LLM report layer에 전달할 익명화/집계 summary 생성

이번 Gate의 범위는 설계 문서화이며, 코드, API, DB schema, env는 변경하지 않는다.

## 2. Current Reference Status

요청 참고 파일:

```text
C:/Users/Administrator/Documents/UCWORKS/UCWORKS Download Files/이노코.py
```

확인 결과, 지정 폴더는 존재하지만 파일 목록이 비어 있어 해당 Python 파일을 읽을 수 없었다. 따라서 이 문서는 현재 Foresight repo의 구현 구조, AdMate 데이터 거버넌스 원칙, Meta API direct pull의 일반 구조, 기존 dashboard Excel export 기반 운영 방식을 기준으로 작성한다.

후속 작업에서 참고 파일이 제공되면 다음만 값 없이 재검토한다.

- import/library 구조
- dashboard export 처리 방식
- Meta API endpoint 종류
- token/auth 처리 방식
- hardcoded credential 존재 여부
- 파일 저장/업로드 흐름

token, key, secret, env 값은 어떤 단계에서도 출력하거나 문서화하지 않는다.

## 3. Scope and Non-scope

### Scope

- Dashboard Excel export 방식과 Meta API direct pull 방식 비교
- Benchmark data source of truth 후보 정의
- 최근 6개월 우선 원칙과 장기 trend 분리 원칙 정의
- Net/Gross, currency, markup, date range, breakdown, objective, optimization_goal metadata 보존 기준 정의
- Foresight 예측/분석에 필요한 normalized benchmark schema 후보 정의
- 수동 업로드 MVP와 API 자동화 후속 단계 분리
- raw campaign-level data를 외부 LLM에 직접 전달하지 않는 원칙 반영
- hardcoded token/script 보안 위험과 token rotation 필요성 명시

### Non-scope

- API 호출
- DB import
- DB schema 변경
- Supabase RPC 변경
- env 추가 또는 변경
- token 발급, 저장, 회전 구현
- LLM 기능 구현
- 실제 Excel/CSV/raw data/model artifact 추가

## 4. Intake Principles

1. Benchmark source는 재현 가능해야 한다.
2. 원천 파일/API 응답 자체보다 승인된 normalized benchmark dataset을 Foresight의 기준 데이터로 본다.
3. 제안/예측에 사용하는 benchmark는 조회 시점 기준 최근 최대 6개월 데이터를 우선한다.
4. 6개월 초과 데이터는 장기 trend 분석용으로 분리한다.
5. Net/Gross, currency, markup, date range, attribution window, breakdown 기준은 반드시 metadata로 남긴다.
6. raw campaign-level data는 외부 LLM에 직접 전달하지 않는다.
7. LLM에는 익명화/집계/요약된 benchmark summary만 전달한다.
8. token, key, secret, credential은 스크립트에 하드코딩하지 않는다.
9. API 자동화 단계에서는 token rotation, account allowlist, audit log, rate limit을 전제로 한다.

## 5. Intake Source Comparison

| 항목 | Dashboard Excel Export | Meta API Direct Pull |
|---|---|---|
| 초기 구현 난이도 | 낮음. 운영자가 기존 dashboard에서 export 후 업로드 | 중간~높음. token, 권한, endpoint, pagination, rate limit 필요 |
| 보안 위험 | 파일 유출, raw campaign data 업로드 위험 | token 유출, API scope 오남용, 계정 전체 수집 위험 |
| 재현성 | export 조건을 metadata로 남기지 않으면 낮음 | request params, endpoint, account scope를 저장하면 높음 |
| 데이터 품질 | dashboard 설정/컬럼명/locale에 의존 | API field/breakdown 정의가 명확하면 안정적 |
| 운영 속도 | 수동 작업 필요 | 자동화 가능 |
| 장애 지점 | 파일 형식 변경, 누락 컬럼, 잘못된 export 기간 | token 만료, 권한 변경, Meta API 변경, rate limit |
| 감사 가능성 | 파일 hash, 업로드자, 승인 이력 필요 | request log, account allowlist, token rotation log 필요 |
| MVP 적합성 | 높음 | 후속 자동화 단계에 적합 |
| 장기 적합성 | 제한적. 검수 workflow가 필요 | 높음. 단, 보안/권한 체계 선행 필요 |

결론:

- MVP는 Dashboard Excel Export 수동 업로드로 시작한다.
- API Direct Pull은 token 보관/회전, account allowlist, audit log, rate limit, 실패 재시도 정책이 준비된 뒤 후속 단계로 진행한다.
- 두 방식 모두 최종 Foresight 기준 데이터는 raw source가 아니라 normalized benchmark dataset이다.

## 6. Source of Truth Candidates

### Candidate A. Raw Dashboard Export File

설명:

- 사용자가 Ads Manager 또는 dashboard에서 export한 Excel/CSV 파일

장점:

- 빠른 MVP 가능
- API 권한 없이 시작 가능
- 운영자가 익숙한 방식

한계:

- 파일 자체를 source of truth로 삼으면 컬럼/필터/기간 기준이 흔들릴 수 있다.
- raw campaign-level data가 포함될 수 있다.
- 파일 공유/보관/삭제 정책이 필요하다.

판정:

- source evidence로는 사용 가능
- 최종 source of truth로는 부적합

### Candidate B. Meta API Raw Response

설명:

- Meta Marketing API insights/adsets/campaigns 등에서 가져온 원시 JSON 응답

장점:

- request params 기반 재현성
- pagination과 account scope 관리 가능
- 자동화와 scheduling 가능

한계:

- token, permission, rate limit, endpoint 변경 리스크
- raw response 장기 보관 시 민감도 상승
- API field/breakdown 조합 제한 존재

판정:

- 자동화 단계의 source evidence로 적합
- 최소 보관 또는 요약 후 폐기 원칙 필요

### Candidate C. Approved Normalized Benchmark Dataset

설명:

- raw file/API response를 validation, normalization, metadata enrichment, review를 거쳐 만든 Foresight benchmark 기준 데이터

장점:

- 예측/분석에 직접 사용 가능
- source metadata를 통해 재현 가능
- LLM-safe summary 생성의 기반
- 수동 업로드와 API 자동화 방식을 모두 수용 가능

한계:

- schema와 validation rule 설계 필요
- 승인 workflow 필요

판정:

- Foresight benchmark source of truth 후보로 가장 적합

권장 결론:

```text
Foresight benchmark source of truth
= Approved Normalized Benchmark Dataset

Raw Excel/API response
= source evidence 또는 temporary staging data
```

## 7. Recency and Long-term Trend Policy

### 7.1 Recent Benchmark Window

기본 예측/제안 기준:

```text
조회 또는 제안 시점 기준 최근 최대 6개월 이내 데이터
```

적용 대상:

- CPM/CPC/CTR/Reach 예측
- 업종/목표/타겟 benchmark
- 예산별 효율 시뮬레이션
- LLM report layer에 전달하는 benchmark summary

필수 metadata:

- `benchmark_window_start`
- `benchmark_window_end`
- `window_policy = recent_6_months`
- `as_of_date`

### 7.2 Long-term Trend Window

6개월 초과 데이터는 기본 예측 기준에 섞지 않고 장기 trend로 분리한다.

적용 대상:

- 시즌성 검토
- 연간 단가 변화
- 장기 업종 trend
- 모델 품질 진단용 참고

필수 metadata:

- `trend_window_start`
- `trend_window_end`
- `window_policy = long_term_trend`
- `excluded_from_default_benchmark = true`

### 7.3 Exception Handling

최근 6개월 데이터가 충분하지 않을 때는 다음 순서로 fallback한다.

1. 동일 업종/목표의 최근 6개월
2. 동일 업종의 최근 6개월
3. 동일 목표의 최근 6개월
4. 전체 Meta 최근 6개월
5. 장기 trend 참고값을 별도 표시

fallback 사용 시 반드시 사용자에게 표시한다.

## 8. Required Metadata Standard

Benchmark row 또는 aggregate는 다음 metadata를 보존해야 한다.

### 8.1 Source Metadata

- `source_type`: dashboard_excel, dashboard_csv, meta_api, manual_adjustment
- `source_name`
- `source_file_hash`
- `source_exported_at`
- `source_uploaded_at`
- `uploaded_by`
- `reviewed_by`
- `review_status`
- `source_row_count`
- `source_timezone`
- `source_locale`

### 8.2 Commercial Metadata

- `currency`: KRW, USD 등
- `net_gross_basis`: net, gross, unknown
- `markup_rate`
- `markup_basis`: included, excluded, unknown
- `agency_fee_basis`
- `tax_included`

원칙:

- Net/Gross 기준이 unknown이면 예측 benchmark로 자동 승인하지 않는다.
- currency가 혼재되면 exchange rate metadata 없이 합산하지 않는다.
- markup 적용 여부가 불명확하면 report 문구에 제한사항으로 표시한다.

### 8.3 Campaign Context Metadata

- `platform`: meta 우선
- `country`
- `account_scope`
- `industry`
- `objective`
- `optimization_goal`
- `buying_type`
- `campaign_type`
- `placement`
- `publisher_platform`
- `device`
- `creative_format`
- `age_range`
- `gender`
- `date_start`
- `date_end`
- `month`
- `attribution_window`

### 8.4 Metric Metadata

- `spend`
- `impressions`
- `reach`
- `clicks`
- `link_clicks`
- `video_views_3s`
- `video_views_thruplay`
- `conversions`
- `cpm`
- `cpc`
- `cpc_link`
- `ctr`
- `vtr_3s`
- `cpv_3s`
- `frequency`

### 8.5 Data Quality Metadata

- `data_quality_status`: valid, warning, rejected
- `validation_errors`
- `validation_warnings`
- `missing_required_fields`
- `outlier_policy`
- `dedupe_key`
- `duplicate_status`
- `minimum_sample_status`
- `campaign_count`
- `row_count`
- `aggregation_level`

## 9. Normalized Benchmark Schema Candidate

이 섹션은 DB schema 변경안이 아니라 설계 후보이다. 실제 DB 반영은 별도 승인과 migration 설계 이후 진행한다.

### 9.1 benchmark_ingest_batch

목적:

- 하나의 파일 업로드 또는 API pull 실행 단위를 기록한다.

후보 필드:

```text
batch_id
created_at
created_by
source_type
source_name
source_file_hash
source_exported_at
source_uploaded_at
platform
account_scope_hash
date_range_start
date_range_end
timezone
currency
net_gross_basis
markup_rate
markup_basis
row_count
validation_status
review_status
reviewed_by
reviewed_at
notes
```

보안 원칙:

- account id 원문 대신 hash 또는 별도 권한 테이블 참조를 우선한다.
- 원천 파일 경로는 내부 storage path만 보관하고 외부 LLM에는 전달하지 않는다.

### 9.2 benchmark_fact_aggregate

목적:

- Foresight 예측/분석에 사용하는 승인된 normalized benchmark fact.

후보 필드:

```text
benchmark_id
batch_id
platform
country
industry
objective
optimization_goal
buying_type
campaign_type
placement
publisher_platform
device
creative_format
age_range
gender
date_start
date_end
month
benchmark_window_policy
currency
net_gross_basis
markup_rate
spend
impressions
reach
clicks
link_clicks
video_views_3s
video_views_thruplay
conversions
cpm
cpc
cpc_link
ctr
vtr_3s
cpv_3s
frequency
campaign_count
row_count
aggregation_level
data_quality_status
validation_warnings
created_at
```

### 9.3 benchmark_llm_summary

목적:

- LLM report layer에 전달 가능한 익명화/집계 summary를 별도 생성한다.

후보 필드:

```text
summary_id
benchmark_id_or_batch_id
summary_scope
platform
industry
objective
date_range_start
date_range_end
campaign_count
metric_summary
percentile_summary
trend_summary
limitations
llm_safe_payload
created_at
```

LLM-safe 조건:

- campaign name 없음
- account id 없음
- advertiser/brand 원문 없음
- row-level data 없음
- 최소 campaign count 기준 충족
- 집계값과 제한사항만 포함

## 10. Manual Upload MVP

### 10.1 MVP Goal

Meta API 자동화 전, 운영자가 dashboard에서 export한 Excel/CSV를 수동 업로드하고 Foresight benchmark로 정규화하는 흐름을 만든다.

### 10.2 MVP Flow

```text
Dashboard export
→ 파일 업로드
→ schema validation
→ metadata 입력/확인
→ normalization
→ data quality report
→ reviewer approval
→ approved normalized benchmark dataset
→ Foresight prediction/analysis 사용
```

### 10.3 Required Upload Metadata

업로드 화면 또는 검수 단계에서 다음을 반드시 입력/확인한다.

- export source
- exported date
- date range
- platform
- country
- currency
- Net/Gross basis
- markup rate
- markup included 여부
- objective mapping 기준
- optimization_goal mapping 기준
- breakdown 기준
- uploader
- reviewer

### 10.4 MVP Validation Rules

필수 컬럼:

- date 또는 month
- spend
- impressions
- reach 또는 frequency 산출 가능 필드
- objective
- industry 또는 industry mapping 가능 필드
- currency

권장 컬럼:

- clicks
- link_clicks
- video_views
- campaign objective
- optimization goal
- placement
- gender
- age
- creative format

reject 조건:

- date range 없음
- currency 없음
- spend/impressions 모두 없음
- Net/Gross 기준 unknown
- markup 기준 unknown
- 파일 hash 중복인데 내용 불일치
- campaign-level raw가 외부 LLM으로 전달되도록 설정된 경우

warning 조건:

- 최근 6개월 밖 데이터만 있음
- sample/campaign count 부족
- objective mapping 누락
- optimization_goal mapping 누락
- 일부 metric 0 또는 null 비중 과다

## 11. Meta API Automation Follow-up

API 자동화는 MVP 이후 단계로 분리한다.

### 11.1 Required Preconditions

- token storage는 코드/env 출력 없이 server-side secret store에서 관리
- token rotation 정책 수립
- app permission scope 문서화
- account allowlist
- internal/admin guard
- rate limit
- request audit log
- retry/backoff
- pagination checkpoint
- raw response retention policy
- failure notification

### 11.2 API Pull Flow

```text
approved account scope
→ internal scheduled pull
→ Meta insights request
→ pagination and retry
→ temporary raw response
→ normalization
→ validation
→ reviewer or auto-approval rule
→ approved normalized benchmark dataset
→ raw response minimize or discard
```

### 11.3 Token Security

금지:

- token hardcoding
- token이 포함된 URL 로그
- token을 query string 형태로 로그 저장
- token 값을 문서, issue, commit, console에 출력
- 개인 계정 token을 장기 운영 자동화에 직접 사용

필수:

- token rotation 주기 정의
- token scope 최소화
- 만료/권한 오류 모니터링
- token 사용 action audit
- token compromise 시 revoke 절차

## 12. LLM Data Boundary

Foresight의 LLM report layer는 benchmark raw data를 직접 받지 않는다.

금지 payload:

- campaign-level raw rows
- campaign name
- ad account id
- advertiser/brand 원문
- token, API URL, request params 원문
- 계약 단가 또는 내부 수수료 원문

허용 payload:

- 업종/목표/기간 단위 집계값
- percentile summary
- sample count
- confidence interval
- validation warnings
- limitation text
- anonymized trend summary

예시:

```text
LLM에 전달 가능:
"최근 6개월 Meta 뷰티/인지도 집계 기준 CPM 중앙값은 X, 상위 25% 기준은 Y이며, 표본 캠페인 수는 N개입니다."

LLM에 전달 금지:
"캠페인 A, 광고계정 B, 광고주 C의 일별 raw spend/click/impression row 전체"
```

## 13. Security Risks

### 13.1 Hardcoded Token Script Risk

운영자가 임시 Python script 또는 notebook에 token을 직접 붙여넣는 방식은 다음 위험을 만든다.

- git commit을 통한 token 유출
- shell history 또는 notebook output 유출
- script 공유 과정에서 credential 확산
- token rotation 누락
- 어떤 계정에서 어떤 데이터를 수집했는지 감사 불가

따라서 API 자동화 전에는 hardcoded token script를 production flow로 인정하지 않는다.

### 13.2 Dashboard File Risk

- Excel/CSV 파일에 campaign name, advertiser, account, spend 등 민감 데이터가 포함될 수 있다.
- 파일은 승인된 storage에만 보관한다.
- 업로드 후 normalized benchmark dataset이 생성되면 raw file 보관 기간을 제한한다.
- LLM에는 raw file을 전달하지 않는다.

### 13.3 API Automation Risk

- Meta API endpoint 변경
- token 만료
- permission scope 변경
- account 범위 과수집
- rate limit 초과
- pagination 중단
- 중복 insert
- partial data ingestion

모든 자동화 ingestion은 batch_id, request scope, status, error summary를 남겨야 한다.

## 14. Data Quality Gates

Gate Foresight-Benchmark-1에서 통과해야 할 설계 기준:

- source_type별 metadata 기준 정의
- 최근 6개월/장기 trend 분리 정책 정의
- Net/Gross/currency/markup 필수 metadata 정의
- raw data LLM 전달 금지 정의
- normalized benchmark schema 후보 정의
- 수동 업로드 MVP와 API 자동화 단계 분리
- hardcoded token 금지와 rotation 필요성 정의

후속 Gate 후보:

- Foresight-Benchmark-2: Manual upload validation spec
- Foresight-Benchmark-3: Normalization mapping spec
- Foresight-Benchmark-4: API automation security spec
- Foresight-Benchmark-5: LLM-safe benchmark summary spec

## 15. Recommended Implementation Phases

### Phase 1. Manual Upload MVP

- Upload UI 또는 admin-only ingestion route 설계
- Excel/CSV schema validation
- metadata input form
- file hash and duplicate check
- normalized preview
- reviewer approval
- LLM-safe summary generation

### Phase 2. Benchmark Store

- approved normalized benchmark dataset 저장
- recent_6_months view와 long_term_trend view 분리
- prediction engine에서 recent benchmark 우선 사용
- trend page에서는 long-term data 별도 표시

### Phase 3. API Automation

- Meta API account allowlist
- internal scheduled pull
- token rotation policy
- request audit
- retry and checkpoint
- raw response minimization

### Phase 4. Agent Core Integration

- benchmark ingestion action audit
- operator action 연결
- Hermes prediction quality feedback 연결
- LLM usage/cost event 기록

## 16. Open Questions

- Net/Gross 기준은 팀 내부 표준을 net으로 둘 것인가, gross로 둘 것인가?
- markup_rate는 단일 고정값인가, 광고주/캠페인별 metadata인가?
- dashboard export의 표준 컬럼 템플릿은 무엇인가?
- 업종 mapping은 campaign name parsing을 유지할 것인가, 별도 taxonomy table을 둘 것인가?
- campaign_count 최소 기준은 몇 개로 둘 것인가?
- raw file retention 기간은 며칠로 둘 것인가?
- API 자동화 token은 어떤 secret store와 rotation 절차로 운영할 것인가?

## 17. Final Recommendation

Gate Foresight-Benchmark-1의 권장 결론은 다음이다.

```text
1. MVP는 dashboard Excel/CSV 수동 업로드로 시작한다.
2. API direct pull은 token rotation, account allowlist, audit log가 준비된 뒤 자동화한다.
3. Foresight의 source of truth는 raw file/API response가 아니라 approved normalized benchmark dataset이다.
4. 최근 6개월 데이터는 예측/제안 기준으로, 6개월 초과 데이터는 장기 trend로 분리한다.
5. Net/Gross, currency, markup, date range, breakdown, objective, optimization_goal metadata 없이는 benchmark로 승인하지 않는다.
6. raw campaign-level data는 외부 LLM에 직접 전달하지 않는다.
```
