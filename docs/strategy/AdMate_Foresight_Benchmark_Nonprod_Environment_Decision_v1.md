# AdMate Foresight Benchmark Nonprod Environment Decision v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-14 nonprod dry-run environment decision

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark schema draft를 어디에서 non-production dry-run migration으로 검증할지 결정한다.

이번 Gate는 환경 결정 문서화만 수행한다. DB 연결, SQL 실행, migration/schema 적용, production env 변경, 코드/API 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain은 수행하지 않는다.

핵심 원칙:

```text
Choose the safest dry-run target.
Do not connect to DB in this Gate.
Do not execute SQL in this Gate.
Do not use production as the rehearsal target.
```

## 2. Decision Summary

권장 순위:

| Rank | Environment | Decision | Reason |
| --- | --- | --- | --- |
| 1 | 별도 Supabase project | Recommended | Supabase-hosted behavior를 보면서 production blast radius를 가장 낮게 유지할 수 있다. |
| 2 | local Supabase | Recommended fallback | 비용과 production risk가 낮고 rollback rehearsal이 쉽다. Hosted Supabase 차이는 별도 검증이 필요하다. |
| 3 | `Admate_AI_MMP` 같은 non-critical existing project disposable schema | Conditional fallback | 빠르지만 기존 object/grant/policy 충돌과 secret boundary 수락 조건이 필요하다. |
| 4 | production AdMate-Data-Core disposable schema | Hold / not recommended for this Gate | production project 내부라서 dry-run 목적과 충돌한다. Production readiness 이후 별도 승인 필요. |
| 5 | production AdMate-Data-Core direct apply | Rejected | production direct apply는 dry-run이 아니며 rollback rehearsal 전 단계에서 금지한다. |

Recommendation:

```text
Use a separate Supabase project as the primary dry-run environment.
Use local Supabase as the second-choice rehearsal when hosted project setup is blocked.
Do not use production AdMate Data Core for Benchmark-15/16 dry-run execution.
```

## 3. Evaluation Criteria

Evaluation criteria:

- 비용
- production risk
- rollback rehearsal 가능성
- `auth.users` reference 가능성
- schema/table conflict 가능성
- secret-safe execution
- reviewer role source 검증 가능성
- 운영 승인 난이도
- 재사용성

Status scale:

| Label | Meaning |
| --- | --- |
| Low | 낮은 비용/위험/난이도 |
| Medium | 관리 가능한 비용/위험/난이도 |
| High | 높은 비용/위험/난이도 |
| Best | 후보 중 가장 유리 |
| Weak | 후보 중 불리 |
| Blocked | 이번 Gate 또는 dry-run 목적에 부적합 |

## 4. Candidate 1: Separate Supabase Project

### 4.1 Description

Foresight benchmark schema dry-run 전용 Supabase project를 별도로 만든다. Production data, production storage, production secret을 붙이지 않는다.

### 4.2 Evaluation

| Criteria | Rating | Notes |
| --- | --- | --- |
| 비용 | Medium | 별도 project 운영 비용 또는 관리 부담이 있다. |
| production risk | Low | production과 분리되므로 blast radius가 작다. |
| rollback rehearsal 가능성 | Best | project reset 또는 schema rollback rehearsal을 반복하기 쉽다. |
| `auth.users` reference 가능성 | High | Supabase-hosted auth schema 존재를 확인할 수 있다. Draft는 soft UUID 전략을 유지한다. |
| schema/table conflict 가능성 | Low | fresh project라면 conflict가 낮다. |
| secret-safe execution | Medium | 별도 credential 필요. Production credential reuse 금지. |
| reviewer role source 검증 가능성 | Medium | 실제 Agent Core 연동은 어렵지만 role placeholder와 RLS posture는 확인 가능하다. |
| 운영 승인 난이도 | Medium | project 생성/권한 부여 승인 필요. |
| 재사용성 | High | 이후 API/report storage rehearsal에도 재사용 가능하다. |

### 4.3 Pros

- Supabase-hosted 환경과 가장 유사하다.
- RLS enable, policy inventory, grant baseline을 현실적으로 확인할 수 있다.
- production과 분리되어 stop condition과 rollback rehearsal을 강하게 적용할 수 있다.
- 후속 Gate에서 schema draft, verify SQL, rollback verify SQL을 순서대로 검증하기 좋다.

### 4.4 Cons

- 별도 project 생성과 access 관리가 필요하다.
- credential handling 절차가 필요하다.
- 실제 production Data Core schema ownership 결정과는 별도일 수 있다.

### 4.5 Decision

```text
Rank 1. Recommended.
```

Use when:

- Supabase-hosted behavior를 확인해야 한다.
- 별도 project 생성이 가능하다.
- production credential을 전혀 쓰지 않을 수 있다.

## 5. Candidate 2: Local Supabase

### 5.1 Description

로컬 Supabase stack 또는 disposable local Postgres/Supabase 환경에서 schema draft와 rollback rehearsal을 수행한다.

### 5.2 Evaluation

| Criteria | Rating | Notes |
| --- | --- | --- |
| 비용 | Low | 별도 hosted project 비용이 없다. |
| production risk | Low | local-only이면 production risk가 가장 낮다. |
| rollback rehearsal 가능성 | Best | reset/recreate가 쉽다. |
| `auth.users` reference 가능성 | Medium | local auth 초기화 상태에 따라 다르다. Draft는 soft UUID라 필수는 아니다. |
| schema/table conflict 가능성 | Low | clean local DB면 conflict가 낮다. |
| secret-safe execution | High | production credential 없이 가능해야 한다. |
| reviewer role source 검증 가능성 | Weak | 실제 hosted auth/Agent Core role 검증은 제한적이다. |
| 운영 승인 난이도 | Low | local-only로 진행하면 승인 난이도가 낮다. |
| 재사용성 | Medium | 개발 검증에는 좋지만 hosted 결과로는 별도 확인이 필요하다. |

### 5.3 Pros

- 가장 저위험으로 SQL syntax, table dependency, check constraint, rollback order를 검증할 수 있다.
- production secret이나 hosted service role 없이 진행 가능하다.
- 반복 rehearsal과 cleanup이 쉽다.

### 5.4 Cons

- hosted Supabase와 extension, auth schema, RLS/grant default가 다를 수 있다.
- reviewer role source와 Agent Core 연동 검증에는 약하다.
- production readiness 증거로는 단독 사용이 부족하다.

### 5.5 Decision

```text
Rank 2. Recommended fallback.
```

Use when:

- 별도 Supabase project 생성이 늦어진다.
- 우선 SQL shape와 rollback order만 검증하고 싶다.
- production credential 없이 local-only로 실행할 수 있다.

## 6. Candidate 3: Non-critical Existing Project Disposable Schema

Example candidate:

```text
Admate_AI_MMP 같은 non-critical existing project disposable schema
```

### 6.1 Description

이미 존재하는 non-critical Supabase/Postgres project에 disposable `foresight` schema 또는 approved temporary schema를 사용한다.

### 6.2 Evaluation

| Criteria | Rating | Notes |
| --- | --- | --- |
| 비용 | Low | 새 project 비용이 없다. |
| production risk | Medium | non-critical이어도 기존 project object와 grant가 있다. |
| rollback rehearsal 가능성 | Medium | 기존 object conflict가 없을 때만 가능하다. |
| `auth.users` reference 가능성 | High | hosted project라면 auth schema 확인 가능성이 높다. |
| schema/table conflict 가능성 | Medium/High | existing schema/grant/policy conflict 가능성이 있다. |
| secret-safe execution | Medium | project credential scope를 명확히 제한해야 한다. |
| reviewer role source 검증 가능성 | Medium | project auth 상태에 따라 일부 확인 가능하다. |
| 운영 승인 난이도 | Medium | existing project owner approval 필요. |
| 재사용성 | Medium | project ownership이 명확하면 재사용 가능하나 혼선 위험이 있다. |

### 6.3 Pros

- 별도 project 생성보다 빠를 수 있다.
- hosted Supabase behavior를 일부 확인할 수 있다.
- `auth.users`, grants, policies baseline을 실제 hosted 환경에서 볼 수 있다.

### 6.4 Cons

- 기존 object, schema, grant, policy와 충돌할 수 있다.
- rollback rehearsal이 non-draft object에 영향을 줄 위험이 있다.
- project가 non-critical인지 운영상 명확해야 한다.
- credential과 output redaction 절차가 필요하다.

### 6.5 Required Risk Acceptance Conditions

Disposable schema 사용 전 위험 수락 조건:

1. Project owner가 non-critical / non-production 상태를 문서로 확인한다.
2. Production data, production storage, production secret이 없음을 확인한다.
3. `foresight` schema가 없거나 완전히 disposable임을 확인한다.
4. Existing object가 있으면 backup/export 및 owner approval 없이 진행하지 않는다.
5. Preflight SQL 결과에서 draft table conflict가 없어야 한다.
6. Broad anon/public policy가 있으면 중단한다.
7. Rollback rehearsal이 non-draft object를 제거하지 않는다는 근거가 있어야 한다.
8. Connection secret은 채팅, 문서, git에 절대 출력/저장하지 않는다.
9. Dry-run 결과 report는 sanitized counts/object names만 포함한다.

### 6.6 Decision

```text
Conditional fallback only.
```

Use only when:

- separate Supabase project와 local Supabase가 모두 막혔다.
- project owner가 disposable schema risk를 승인했다.
- preflight 결과가 clean하다.

## 7. Candidate 4: Production AdMate Data Core Disposable Schema

### 7.1 Description

Production AdMate Data Core project 안에 disposable schema를 만들어 dry-run하는 방식이다.

### 7.2 Evaluation

| Criteria | Rating | Notes |
| --- | --- | --- |
| 비용 | Low | 새 project 비용은 없다. |
| production risk | High | production project 내부라서 dry-run isolation이 약하다. |
| rollback rehearsal 가능성 | Weak | production 내부 rollback rehearsal 자체가 운영 위험이다. |
| `auth.users` reference 가능성 | High | 실제 production auth와 가까울 수 있으나 이번 Gate에는 과하다. |
| schema/table conflict 가능성 | High | production namespace/policy/grant와 충돌할 수 있다. |
| secret-safe execution | Weak | production credential 접근 위험이 크다. |
| reviewer role source 검증 가능성 | High | 실제성과 위험이 동시에 높다. |
| 운영 승인 난이도 | High | production change control 필요. |
| 재사용성 | Low | dry-run 대상으로 재사용하기 어렵고 위험이 누적된다. |

### 7.3 Pros

- 실제 Data Core 환경과 가장 가깝다.
- auth, grants, policies, project settings의 production reality를 볼 수 있다.

### 7.4 Cons

- production direct or near-direct rehearsal이다.
- rollback rehearsal이 production project object inventory에 영향을 줄 수 있다.
- production secret handling과 audit burden이 크다.
- dry-run의 목적과 안전 경계를 흐린다.

### 7.5 Decision

```text
Hold / not recommended for Benchmark-15 or Benchmark-16.
```

Use only if a later production readiness review explicitly approves a production-adjacent rehearsal with:

- Data Core owner approval.
- Security approval.
- backup/export plan.
- change window.
- rollback runbook.
- audit/operator trace.
- no production data readout in reports.

## 8. Candidate 5: Production AdMate Data Core Direct Apply

### 8.1 Description

Review SQL draft를 production AdMate Data Core에 직접 적용하는 방식이다.

### 8.2 Evaluation

| Criteria | Rating | Notes |
| --- | --- | --- |
| 비용 | Low | 별도 환경 비용은 없다. |
| production risk | Blocked | production direct apply는 dry-run이 아니다. |
| rollback rehearsal 가능성 | Blocked | rehearsal 없이 production rollback을 전제로 한다. |
| `auth.users` reference 가능성 | High but unsafe | 실제 production auth와 가깝지만 검증 장소로 부적합하다. |
| schema/table conflict 가능성 | High | production conflict는 즉시 운영 리스크다. |
| secret-safe execution | Weak | production secret exposure risk가 크다. |
| reviewer role source 검증 가능성 | High but unsafe | 검증 이득보다 위험이 크다. |
| 운영 승인 난이도 | High | production change control 필수. |
| 재사용성 | Blocked | dry-run target으로 사용할 수 없다. |

### 8.3 Decision

```text
Rejected.
```

Reason:

- dry-run 목적에 반한다.
- preflight/rollback rehearsal 전 production schema 적용은 금지되어 있다.
- raw/benchmark/audit/retention blocker가 아직 남아 있다.
- production readiness review가 완료되지 않았다.

## 9. Recommendation

### 9.1 First Choice

```text
Separate Supabase project
```

Why:

- hosted Supabase behavior를 검증할 수 있다.
- production과 분리되어 rollback rehearsal이 안전하다.
- future API/report storage rehearsal까지 재사용 가능하다.
- `auth.users` availability는 확인하되 draft의 soft UUID reference 전략은 유지할 수 있다.

Required conditions:

- project name clearly marks non-production/dry-run.
- no production data, storage, or credential.
- project owner and operator are known.
- connection secret is handled outside repo/chat.
- preflight SQL must pass before schema draft apply.

### 9.2 Second Choice

```text
Local Supabase
```

Why:

- lowest risk and lowest cost.
- good first rehearsal for syntax, FK order, check constraints, RLS enable, index creation, rollback order.
- no production credential required.

Limitations:

- hosted Supabase behavior may still need later confirmation.
- Agent Core/reviewer role integration cannot be fully validated.

### 9.3 Conditional Fallback

```text
Non-critical existing project disposable schema
```

Use only after risk acceptance:

- non-critical status confirmed.
- preflight shows no schema/table conflict.
- rollback cannot affect non-draft objects.
- broad grants/policies are absent.
- credentials are non-production and secret-safe.

### 9.4 Rejected / Hold

Rejected:

- production AdMate Data Core direct apply.

Hold:

- production AdMate Data Core disposable schema.

## 10. Execution Order in Recommended Environment

For first-choice separate Supabase project:

1. Create or select approved non-production Supabase project.
2. Confirm no production data, storage, or secrets are attached.
3. Assign operator and reviewer for dry-run execution.
4. Handle connection secret outside chat and repo.
5. Run `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql`.
6. Review preflight output and stop if any stop condition appears.
7. Run `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql`.
8. Run `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql`.
9. Confirm row count is zero and no broad policy exists.
10. Run `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`.
11. Run `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql`.
12. Produce sanitized dry-run result report.

For second-choice local Supabase:

1. Start clean local Supabase target.
2. Confirm no production env file or production credential is used.
3. Run the same preflight, draft, verify, rollback, post-rollback sequence.
4. Document local-specific differences from hosted Supabase.
5. Treat result as preliminary if hosted behavior is still required.

This Gate does not perform any of these execution steps.

## 11. Preparation Checklist

Prepare before the next execution Gate:

- selected environment and rank.
- target owner.
- operator.
- reviewer.
- explicit non-production confirmation.
- secret handling path.
- rollback permission.
- backup/export decision.
- reset/disposal method.
- SQL file list and exact order.
- sanitized result report template.
- stop condition checklist.

Required files:

- `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql`
- `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql`
- `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql`

Do not prepare:

- raw data files.
- seed data.
- production env values.
- API route changes.
- migration application scripts.

## 12. Stop Conditions

Stop before or during the next Gate if:

- target is production.
- target is ambiguous.
- production credential is required.
- production data or storage is attached.
- existing `foresight` schema contains non-disposable objects.
- draft table conflict appears.
- broad anon/public policy exists.
- `auth.users` direct FK becomes required.
- RLS cannot be enabled.
- rollback rehearsal cannot be run.
- backup/export is required but unavailable.
- operator cannot produce sanitized report.
- any secret/env value would be printed or committed.

## 13. Next Gates

### Foresight-Benchmark-15: Selected Environment Preflight Execution

Scope candidate:

- use the selected environment only.
- run read-only preflight SQL.
- produce sanitized preflight result.
- no schema draft apply unless separately approved in the next Gate.

### Foresight-Benchmark-16: Nonprod Schema Dry-run Execution

Scope candidate:

- apply schema draft in approved non-production target.
- run verify SQL.
- run rollback rehearsal.
- run post-rollback verify.
- no production target and no raw data.

### Foresight-Benchmark-17: Dry-run Result Review

Scope candidate:

- review Benchmark-15/16 results.
- decide whether production readiness review can begin.
- identify remaining blockers for Data Core, RLS, retention, actor source, and API separation.

## 14. Final Decision

Benchmark-14 decision:

```text
1st choice: separate Supabase project.
2nd choice: local Supabase.
Conditional fallback: non-critical existing project disposable schema.
Hold: production AdMate Data Core disposable schema.
Reject: production AdMate Data Core direct apply.
```

The next Gate should start with the first-choice environment unless setup is blocked. If blocked, use local Supabase for preliminary rehearsal and record the hosted-Supabase gap explicitly.
