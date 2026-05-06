# AdMate Foresight Legacy DB Inventory v1

작성일: 2026-05-06

문서 상태: Gate Foresight-DB-1 read-only inventory 초안

대상:

- Legacy source candidate: 기존 Supabase project `Ad-Planner AI`
- Future integration candidate: `Admate-Vision` production, `foresight` schema

## 1. Purpose

이 문서는 기존 `Ad-Planner AI` Supabase DB를 `AdMate Foresight` 제품 repo 관점에서 이관 후보로 점검하기 위한 read-only inventory다.

이번 단계의 목적은 실제 migration이 아니라 아래 항목을 분류하는 것이다.

- legacy DB schema/table/function/storage/auth 현황
- benchmark, prediction, report, upload 관련 table 후보
- raw campaign-level data 포함 가능성이 있는 table 후보
- Vision production의 `foresight` schema로 이관 가능한 데이터와 보류해야 할 데이터
- 이관 시 필요한 normalized table 후보

## 2. Scope and Guardrails

이번 Gate의 범위:

- read-only inventory만 수행
- DB write, import, export, migration 금지
- Admate-Vision production 변경 금지
- Foresight app env 변경 금지
- secret, API key, token, credential, env 값 출력 금지
- raw campaign-level row 출력 금지

이번 문서 작성 중 실제 DB write/import/export/migration은 수행하지 않았다.

## 3. Inventory Execution Status

### 3.1 Live DB Metadata Query Status

저장된 local migration env의 `SOURCE_DB_URL` 후보를 내부적으로만 사용해 read-only metadata query를 시도했다.

실행 원칙:

- connection value는 출력하지 않음
- `BEGIN READ ONLY` transaction 사용
- schema/table/column/RLS/index/constraint/auth/storage metadata만 조회하도록 설계
- table row count는 `count(*)`로 조회하되 raw row는 조회하지 않도록 설계
- 실패 시 connection string, password, token, host 전체 값을 출력하지 않음

결과:

| Item | Status |
| --- | --- |
| legacy DB direct connection | Blocked |
| failure point | DNS resolution 단계 |
| DB write/import/export | Not executed |
| raw row read | Not executed |
| secret/env value output | Not executed |

따라서 이 문서의 live DB 항목 중 row count, RLS enabled, index/constraint, `auth.users`, storage bucket 현황은 아직 **not verified** 상태다.

### 3.2 Local Evidence Used

DB 연결이 막힌 상태에서 다음 local repo evidence만 읽어 legacy structure 후보를 정리했다.

| Evidence | Read-only findings |
| --- | --- |
| `supabase/add_placement_creative.sql` | `ad_data` table, `get_monthly_aggregates`, `get_demographic_aggregates` RPC 후보 확인 |
| `lib/xlsxLoader.ts` | Foresight prediction이 Supabase RPC 집계 결과를 읽는 구조 확인 |
| `python/data_loader.py` | Python ML engine도 동일 RPC를 학습 데이터 소스로 사용 |
| `lib/metaSync.ts` | Meta insights를 `ad_data` row로 변환해 insert하는 legacy sync path 확인 |
| `scripts/upload_to_supabase.py` | local cache를 `ad_data`에 REST insert하는 legacy upload script 확인 |
| `README.md` | current data flow: Supabase `ad_data` -> RPC -> TypeScript/Python predictor 확인 |

## 4. Schema Inventory

Live DB query가 DNS 단계에서 막혀 실제 schema 목록은 확인하지 못했다.

### 4.1 Verified from Live DB

| Schema | Status | Notes |
| --- | --- | --- |
| public | Not verified | legacy Foresight code는 `public.ad_data`를 전제로 함 |
| auth | Not verified | `auth.users` 존재 여부/row count 미확인 |
| storage | Not verified | storage bucket 존재 여부 미확인 |

### 4.2 Inferred from Repo

| Schema candidate | Confidence | Basis |
| --- | --- | --- |
| `public` | High | SQL/RPC code가 unqualified `ad_data`, function names를 사용 |
| `auth` | Medium | Supabase project라면 일반적으로 존재하나 row count 미검증 |
| `storage` | Medium | Supabase project라면 일반적으로 존재하나 bucket 미검증 |
| `foresight` | Future target only | Admate-Vision production 이관 후보 schema |

## 5. Table Inventory

Live table list and row counts are not verified yet.

### 5.1 Table Candidates Inferred from Repo

| Table candidate | Schema candidate | Row count | RLS | Purpose | Evidence | Initial decision |
| --- | --- | ---: | --- | --- | --- | --- |
| `ad_data` | `public` | Not verified | Not verified | campaign performance source table for prediction and benchmark aggregation | SQL, loaders, sync/upload scripts | 정규화 후 이관 |
| `auth.users` | `auth` | Not verified | Managed by Supabase | app user identity table if auth was used | requested inventory item only | 폐기/보류 |
| `storage.buckets` | `storage` | Not verified | Managed by Supabase | upload/report/model storage candidate if used | requested inventory item only | legacy reference로만 유지 |

현재 repo에서 `benchmark`, `prediction`, `report`, `upload`라는 별도 table명은 확인되지 않았다. legacy implementation은 대부분 `ad_data`와 RPC aggregation에 의존하는 구조로 보인다.

## 6. ad_data Column Candidate Inventory

`ad_data`는 live DB column query로 검증하지 못했지만, SQL/RPC와 sync/upload code 기준으로 다음 column 후보가 확인된다.

| Column candidate | Type candidate | Role | Raw campaign-level risk | Source evidence |
| --- | --- | --- | --- | --- |
| `업종` | text | industry dimension | Medium | SQL/RPC, loaders, sync/upload |
| `캠페인이름` | text | campaign identifier/name | High | sync/upload |
| `목표` | text | objective dimension | Medium | SQL/RPC, loaders |
| `최적화목표` | text | optimization goal dimension | Medium | SQL/RPC, loaders |
| `노출위치` | text | placement dimension | Medium | SQL migration, sync |
| `소재형태` | text | creative format dimension | Medium | SQL migration, sync |
| `성별` | text | demographic breakdown | High | SQL/RPC, loaders |
| `연령` | text | demographic breakdown | High | SQL/RPC, loaders |
| `도달` | numeric | reach metric | Medium | SQL/RPC, sync/upload |
| `노출` | numeric | impressions metric | Medium | SQL/RPC, sync/upload |
| `지출금액` | numeric | spend metric | High | SQL/RPC, sync/upload |
| `빈도` | numeric | frequency metric | Medium | SQL/RPC, sync/upload |
| `cpm` | numeric | CPM metric | Medium | SQL/RPC, sync/upload |
| `cpc` | numeric | CPC metric | Medium | SQL/RPC, sync/upload |
| `cpc_link` | numeric | link-click CPC metric | Medium | SQL/RPC, sync/upload |
| `영상조회수` | numeric | video view count | Medium | SQL/RPC, sync/upload |
| `영상조회비용` | numeric | video view cost | Medium | SQL/RPC, sync/upload |
| `날짜` | text/date candidate | date grain | Medium | SQL/RPC, sync/upload |

### 6.1 Type Verification Status

실제 DB data type은 미검증이다. SQL 함수 반환 타입은 `TEXT`와 `NUMERIC` 중심이며, loader는 숫자형 필드를 `number` 또는 pandas numeric으로 보정한다.

Live DB 연결 후 확인해야 할 항목:

- `날짜`가 `text`, `date`, `timestamp` 중 무엇인지
- numeric columns가 `numeric`, `double precision`, `integer`, `text` 중 무엇인지
- nullable 여부
- default 여부
- generated/identity column 존재 여부

## 7. RPC / Function Inventory

Repo SQL 기준 function 후보는 아래와 같다.

| Function candidate | Return grain | Source table | Purpose | Migration decision |
| --- | --- | --- | --- | --- |
| `get_monthly_aggregates(p_limit, p_offset)` | 업종 x 목표 x 최적화목표 x 노출위치 x 소재형태 x 날짜 | `ad_data` | prediction/trend/seasonality source | 정규화 후 재작성 |
| `get_monthly_aggregates_count()` | grouped count | `ad_data` | pagination support | 필요성 재검토 |
| `get_demographic_aggregates(p_limit, p_offset)` | 업종 x 목표 x 최적화목표 x 성별 x 연령 | `ad_data` | demographic benchmark source | 정규화 후 재작성 |
| `get_demographic_aggregates_count()` | grouped count | `ad_data` | pagination support | 필요성 재검토 |

Current code path는 count RPC를 쓰지 않고, page가 비는 시점까지 `get_monthly_aggregates`, `get_demographic_aggregates`를 반복 호출한다.

## 8. Row Count Inventory

Live DB row count는 미확인이다.

| Object | Row count | Status |
| --- | ---: | --- |
| `public.ad_data` | Not verified | live DB connection blocked |
| `auth.users` | Not verified | live DB connection blocked |
| `storage.buckets` | Not verified | live DB connection blocked |

Next step에서 유효한 read-only connection이 제공되면 아래 쿼리 범위를 사용한다.

```sql
begin read only;
select count(*) from public.ad_data;
select count(*) from auth.users;
select count(*) from storage.buckets;
rollback;
```

위 쿼리는 row count만 확인하며 raw row value는 조회하지 않는다.

## 9. RLS / Index / Constraint Inventory

Live DB metadata query가 막혀 미확인이다.

### 9.1 Required Read-only Queries for Next Attempt

```sql
begin read only;

select
  n.nspname as table_schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r', 'p');

select schemaname, tablename, indexname
from pg_indexes
where schemaname not like 'pg_%';

select table_schema, table_name, constraint_name, constraint_type
from information_schema.table_constraints
where table_schema not like 'pg_%';

rollback;
```

### 9.2 Expected Risk

`ad_data`가 public schema에 있고 anon key 기반 RPC/read access를 사용하므로, RLS가 disabled이거나 overly broad policy일 가능성을 반드시 점검해야 한다.

## 10. auth.users Inventory

`auth.users` 존재 여부와 row count는 미확인이다.

Migration policy:

- `auth.users`는 Vision production으로 그대로 복사하지 않는다.
- 사용자 identity는 Agent Core 또는 Vision production auth 체계를 source of truth로 둔다.
- legacy auth 정보는 필요 시 user mapping reference로만 검토한다.
- email, provider id, auth metadata 등은 privacy/security review 전 이관 금지다.

Initial decision: `폐기/보류`

## 11. Storage Bucket Inventory

Storage bucket 존재 여부는 미확인이다.

Migration policy:

- raw Excel/CSV/upload/report/model artifact bucket은 존재하더라도 즉시 복사하지 않는다.
- 파일명, owner, created_at, mime type, size 정도의 metadata inventory만 먼저 수행한다.
- raw campaign-level file은 익명화/집계 정책 전 Vision으로 복사하지 않는다.
- model artifact는 재현성/버전 정책 확정 전 repo 또는 Vision storage로 옮기지 않는다.

Initial decision: `legacy reference로만 유지`

## 12. Product Table Candidate Classification

### 12.1 benchmark / prediction / report / upload candidates

| Candidate | Current evidence | Product role | Decision |
| --- | --- | --- | --- |
| `ad_data` | confirmed by code/SQL | prediction, benchmark, trend source | 정규화 후 이관 |
| monthly aggregate RPC output | confirmed by code/SQL | prediction model feature source | 정규화 후 이관 |
| demographic aggregate RPC output | confirmed by code/SQL | demographic benchmark source | 정규화 후 이관 |
| upload cache/source files | script references local cache only | one-time legacy import source | 폐기/보류 |
| report table | not found | future AI report storage | create new normalized table |
| prediction result table | not found | future prediction quality tracking | create new normalized table |
| benchmark batch table | not found | future benchmark intake tracking | create new normalized table |

### 12.2 raw campaign-level risk candidates

| Candidate | Risk | Reason | Decision |
| --- | --- | --- | --- |
| `ad_data.캠페인이름` | High | campaign name may contain advertiser/brand/product info | 익명화/집계 후 이관 |
| `ad_data.성별`, `ad_data.연령` | High | demographic breakdown can increase re-identification risk when combined with campaign/date | 익명화/집계 후 이관 |
| `ad_data.지출금액` | High | commercial spend data | 정규화 후 restricted access |
| `ad_data.노출위치`, `ad_data.소재형태` | Medium | placement/creative breakdown | 정규화 후 이관 |
| Meta sync source response | High | may include account/campaign identifiers and raw metrics | 폐기/보류 unless sanitized |
| upload cache JSON | High | likely raw row source | 폐기/보류 unless anonymized |

## 13. Migration Decision Matrix

판정 기준:

- 그대로 복사 가능
- 정규화 후 이관
- 익명화/집계 후 이관
- 폐기/보류
- legacy reference로만 유지

| Object candidate | Decision | Rationale |
| --- | --- | --- |
| `public.ad_data` full raw rows | 익명화/집계 후 이관 | campaign name, demographic breakdown, spend metrics 포함 가능 |
| `public.ad_data` normalized metric aggregates | 정규화 후 이관 | prediction/benchmark에 필요한 핵심 데이터 |
| `get_monthly_aggregates` logic | 정규화 후 이관 | `foresight` schema의 view/materialized view/RPC로 재작성 후보 |
| `get_demographic_aggregates` logic | 정규화 후 이관 | demographic benchmark table/view로 분리 |
| local upload scripts | 폐기/보류 | write script이며 production migration path로 부적합 |
| Meta sync raw response | 폐기/보류 | external API raw payload 및 token/log risk |
| auth users | 폐기/보류 | Vision/Agent Core auth가 source of truth |
| storage buckets | legacy reference로만 유지 | 파일 metadata만 먼저 inventory 필요 |
| report outputs if any | legacy reference로만 유지 | live table 미확인, future report schema 새로 설계 필요 |

## 14. Foresight Schema Normalized Table Candidates

Vision production에는 legacy `public.ad_data`를 그대로 복사하기보다 `foresight` schema 아래 normalized objects로 분리하는 것이 적합하다.

### 14.1 Core Intake

| Candidate table | Purpose |
| --- | --- |
| `foresight.benchmark_ingest_batch` | source file/API batch metadata, source hash, date range, owner, validation status |
| `foresight.benchmark_source_map` | legacy/export column -> normalized field mapping version |
| `foresight.benchmark_data_quality_issue` | missing columns, type mismatch, metric reconciliation issue |

### 14.2 Normalized Facts

| Candidate table | Purpose |
| --- | --- |
| `foresight.campaign_performance_fact` | anonymized campaign/date/objective/breakdown metric fact |
| `foresight.benchmark_aggregate_fact` | industry/objective/optimization_goal/date/breakdown aggregated benchmark |
| `foresight.demographic_benchmark_fact` | gender/age benchmark aggregate with minimum sample safeguards |
| `foresight.placement_creative_benchmark_fact` | placement/creative format benchmark aggregate |

### 14.3 Prediction and Analysis

| Candidate table | Purpose |
| --- | --- |
| `foresight.prediction_run` | prediction request metadata, model version, input summary |
| `foresight.prediction_result` | predicted CPM/CPC/CTR/reach outputs and confidence metadata |
| `foresight.prediction_actual_comparison` | predicted vs actual performance quality tracking |
| `foresight.analysis_run` | deterministic analysis run metadata |
| `foresight.analysis_result_metric` | p-value, CI, effect size, uplift, sample size outputs |
| `foresight.llm_report_draft` | LLM-generated narrative based only on anonymized/aggregated result payload |

### 14.4 Reference Dimensions

| Candidate table | Purpose |
| --- | --- |
| `foresight.dim_industry` | normalized industry taxonomy |
| `foresight.dim_objective` | objective mapping and labels |
| `foresight.dim_optimization_goal` | Meta optimization_goal mapping |
| `foresight.dim_breakdown` | allowed breakdown values and grouping policy |

## 15. Source of Truth Recommendation

Legacy `Ad-Planner AI` DB should be treated as a **legacy reference and source candidate**, not as the direct production source of truth for Admate-Vision.

Recommended source-of-truth direction:

1. Use legacy `ad_data` and RPC logic to understand existing benchmark/prediction behavior.
2. Do not copy raw `ad_data` into Vision production as-is.
3. Create `foresight` schema normalized tables with explicit metadata, date range, currency, Net/Gross, objective, optimization_goal, breakdown, validation status.
4. Load only approved anonymized/aggregated data into Vision after a separate migration plan and approval.
5. Keep raw source files and legacy source DB out of LLM payloads.

## 16. Blockers Before Real Migration

운영 이관 전 blocker:

1. Valid read-only legacy DB connection 확보
2. Live schema/table/column/RLS/index/constraint inventory 재실행
3. `auth.users` and storage bucket metadata 확인
4. `ad_data` exact row count and date coverage 확인
5. raw campaign-level identifiers column 확인
6. RLS policy 확인
7. service role usage path와 key rotation owner 확인
8. Vision production `foresight` schema migration plan 별도 승인
9. anonymization/hash salt policy 확정
10. row-level data retention policy 확정

## 17. Next Read-only Query Plan

유효한 connection이 준비되면 다음 순서로 read-only inventory를 다시 실행한다.

1. schema list
2. table/view/materialized view list
3. exact row count per table
4. column list and data type per table
5. RLS enabled/forced status
6. policy list, index list, constraint list
7. `auth.users` existence and count
8. `storage.buckets` existence and count
9. product table classification
10. migration decision matrix update

이 단계에서도 raw row sample은 조회하지 않는다. 필요한 경우에도 column-level statistics만 익명화/집계해서 기록한다.

## 18. Current Conclusion

Gate Foresight-DB-1의 현재 결론은 다음과 같다.

- Live DB inventory는 connection DNS blocker 때문에 완료되지 않았다.
- Repo evidence 기준 legacy core object는 `public.ad_data`와 2개 주요 aggregate RPC로 보인다.
- `ad_data`는 campaign name, demographic breakdown, spend metrics를 포함할 가능성이 높아 그대로 복사하면 안 된다.
- Vision production에는 `foresight` schema를 새로 두고 normalized aggregate/fact 중심으로 이관하는 방향이 적합하다.
- 실제 migration은 별도 승인 전 금지하며, 다음 단계는 유효한 read-only connection 확보 후 live metadata inventory 재실행이다.
