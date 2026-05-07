# AdMate Foresight Benchmark MMP Preflight Execution Plan v1

작성일: 2026-05-07

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 `Admate_AI_MMP` disposable schema fallback을 사용할 수 있는지 확인하기 위해, Supabase SQL Editor에서 read-only preflight SQL을 실행하는 절차와 결과 수집 양식을 정의한다.

이번 Gate는 실행 계획 문서화만 수행한다. SQL 실행, DB 연결, migration 적용, schema 변경, production env 변경, 코드/API 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain 실행은 하지 않는다.

## 2. Background

최근 Gate 기준:

- Local Supabase는 Supabase CLI와 Docker CLI가 현재 shell에서 탐지되지 않아 즉시 실행이 blocked 상태다.
- `Admate_AI_MMP`는 non-critical existing project disposable schema fallback 후보로 분류되었다.
- 아직 DB write, schema 생성, migration 적용, rollback draft 실행은 금지되어 있다.
- 첫 번째 실행 단계는 read-only preflight SQL 결과 확인이어야 한다.

## 3. Execution Target

| Item | Decision |
| --- | --- |
| Supabase project | `Admate_AI_MMP` |
| Environment purpose | non-critical fallback / disposable schema preflight |
| Target classification | non-production candidate only |
| Production exclusion | Must not be AdMate Data Core production |
| SQL operation type | read-only preflight only |
| Schema apply | forbidden in this Gate |
| Rollback execution | forbidden in this Gate |

The operator must verify directly in Supabase Dashboard that the selected project is `Admate_AI_MMP` and not an AdMate Data Core production project.

## 4. Pre-execution Confirmation

Before running any SQL in a later approved execution Gate, the human operator must confirm all items below.

| Check | Required confirmation |
| --- | --- |
| Dashboard project name | Supabase Dashboard shows `Admate_AI_MMP`. |
| Project reference | Operator records only a sanitized project reference or internal label if approved. No credential-bearing URL is pasted into chat or docs. |
| SQL Editor target | SQL Editor is pointed at `Admate_AI_MMP`, not another project. |
| Production confusion | Target is not AdMate Data Core production and is not production-adjacent. |
| Project purpose | Project owner accepts use as non-critical fallback for read-only preflight. |
| SQL scope | Only `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql` is executed. |
| Output handling | Results are copied into the sanitized result table in this document. |
| Secret handling | No connection string, service role value, provider credential, token value, session URL, or raw data row is copied. |

If any item is uncertain, stop before running SQL.

## 5. SQL To Execute

Execute only this file in the next approved Gate:

```text
docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql
```

This SQL is read-only and is intended to inventory the target context, schema conflicts, extension availability, `auth.users` availability, policies, grants, and production-looking target warnings.

Do not execute these files during preflight:

```text
docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql
docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql
docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql
docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql
```

The schema draft contains DDL and is not permitted until a later Gate explicitly approves a non-production schema dry-run.

## 6. Operator Execution Procedure For Later Gate

This procedure is for a future approved execution Gate. It is not performed in this Gate.

1. Open Supabase Dashboard.
2. Select project `Admate_AI_MMP`.
3. Confirm the project is not AdMate Data Core production.
4. Open SQL Editor for the selected project.
5. Paste only the contents of `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql`.
6. Before clicking run, scan the SQL editor tab and target label one more time.
7. Run the preflight SQL once.
8. Copy only sanitized result values into the result collection table below.
9. If any SQL Editor warning or error appears, stop and report the sanitized message without credentials.
10. Do not run schema draft, verify SQL, rollback SQL, or any manual follow-up SQL in the same Gate unless explicitly approved later.

## 7. Result Collection Table

The operator should return this table after the read-only preflight execution.

| Result area | Value to provide | Expected / acceptable result | Stop if |
| --- | --- | --- | --- |
| Target project confirmation | `Admate_AI_MMP` confirmed: yes/no | yes | no or uncertain |
| Production exclusion | Not AdMate Data Core production: yes/no | yes | no or uncertain |
| Current database/schema | Sanitized database name and current schema | non-production-looking name, usually current schema visible | production-looking or ambiguous |
| Current role category | Sanitized role category only | operator-approved non-production access | role appears production privileged and unapproved |
| Server version | Major/minor version only | PostgreSQL/Supabase-compatible | error or unsupported version |
| Target warning result | Output from `target_warning` | `review target name manually` or equivalent non-stop result | `STOP: target name looks production-like` |
| `foresight` schema count | numeric count | `0`, or `1` only if disposable and owner-approved | existing non-disposable schema |
| Existing `foresight` table list | sanitized table names/count only | no existing draft table conflict | existing benchmark draft table conflict |
| Existing draft table count | numeric count | `0` | greater than `0` |
| Existing `foresight` object inventory | sanitized object names/count only | empty or clearly disposable | shared/non-draft objects |
| Extension availability | `pgcrypto`, `uuid-ossp` presence/version summary | current draft does not require extension; `pgcrypto` useful if future UUID default changes | required future extension missing after draft changes |
| `auth.users` availability | numeric count | `1` preferred for hosted compatibility; `0` requires soft-reference-only path review | direct FK strategy required but unavailable |
| Existing policies | count and sanitized policy names | none, or no broad policy | broad anon/public policy |
| Grant baseline | grants to `anon`, `authenticated`, `public` | none or reviewed safe grants | unexpected broad read/write grants |
| Column inventory | schema/table column count summary | no conflict with draft tables | conflicting existing table shape |
| Preflight summary action | output from `recommended_action` | `preflight review required before apply rehearsal` | any `STOP` action |
| SQL Editor errors | sanitized error message or `none` | none | any warning/error requiring owner review |

Do not include:

- database connection strings.
- service role values.
- credential-bearing project URLs.
- provider tokens.
- session URLs.
- raw rows.
- raw provider responses.
- advertiser, account, campaign, ad set, or ad identifiers.

## 8. Sanitized Result Template

Use this shape when reporting the result back into the planning thread.

```text
environment:
  project_label: Admate_AI_MMP
  production_exclusion_confirmed:
  sql_editor_target_confirmed:
  operator:
  reviewer:

preflight_results:
  current_database_schema:
  target_warning:
  foresight_schema_count:
  existing_draft_table_count:
  existing_object_summary:
  extension_summary:
  auth_users_availability:
  policy_summary:
  grant_summary:
  column_inventory_summary:
  preflight_recommended_action:
  sql_editor_error_summary:

decision:
  proceed_to_schema_dry_run_plan:
  revise_sql_draft:
  fallback_rejected:
  require_local_supabase_setup:
  blockers:
```

The result should use `yes/no`, counts, and sanitized object names only. It should not include raw data, secrets, or credential-bearing identifiers.

## 9. Stop Conditions

Stop immediately if any condition below is true.

| Stop condition | Reason |
| --- | --- |
| Target is AdMate Data Core production | Production direct apply and production preflight are outside this Gate. |
| Target project is ambiguous | Wrong SQL Editor target could create production risk. |
| SQL file is not the preflight SQL | Schema draft, verify, rollback, or ad hoc SQL are not approved. |
| Existing benchmark draft tables conflict | Later rollback could affect non-draft objects. |
| Existing `foresight` schema is non-disposable | Shared object risk. |
| Required extension becomes missing | Future draft dependency cannot be satisfied safely. |
| `auth.users` direct FK becomes required but is impossible | Actor strategy is unresolved. |
| Unexpected broad policy or grant exists | Ordinary user exposure risk. |
| SQL Editor shows warning/error | Requires review before proceeding. |
| Any output includes secrets or raw data | Privacy/security boundary violation. |
| Operator cannot produce sanitized result | Review evidence would be unsafe or incomplete. |

If stopped, record only a sanitized stop reason and do not continue with manual SQL.

## 10. Result Decision Criteria

### 10.1 Proceed To Schema Dry-run Plan

Proceed to a later schema dry-run planning Gate only if:

- target is confirmed as `Admate_AI_MMP`.
- target is confirmed not production.
- preflight SQL was the only SQL executed.
- no existing draft table conflict exists.
- no non-disposable `foresight` objects exist.
- `auth.users` strategy remains compatible with soft UUID references.
- no broad anon/public policies or grants are found.
- SQL Editor reports no blocking warning/error.
- result table is sanitized and complete.

### 10.2 Revise Draft

Revise the SQL draft before dry-run if:

- extension dependency assumptions changed.
- object names conflict with existing non-critical project conventions.
- schema name must change from `foresight` to a clearly disposable namespace.
- actor strategy needs additional comments or constraints.
- verify SQL would not correctly evaluate the chosen fallback schema.

### 10.3 Fallback Rejected

Reject `Admate_AI_MMP` fallback if:

- target cannot be distinguished from production.
- owner does not approve disposable-schema use.
- existing objects/grants/policies create unacceptable shared-project risk.
- rollback rehearsal cannot be safely scoped.
- preflight output cannot be sanitized.

### 10.4 Require Local Supabase Setup

Return to local Supabase setup if:

- `Admate_AI_MMP` fallback is rejected.
- hosted fallback is too risky for schema apply.
- only syntax/table/rollback order needs validation.
- Supabase CLI and container runtime can be prepared without production credentials.

## 11. Follow-up Gate Candidates

- `Foresight-Benchmark-17 MMP read-only preflight execution`
- `Foresight-Benchmark-18 MMP schema dry-run execution plan`
- `Foresight-Benchmark-19 MMP dry-run result review`

Keep these Gates separate. Preflight execution should not automatically authorize schema draft apply, rollback rehearsal, API implementation, DB import/export, or benchmark data promotion.

## 12. Final Boundary

This plan authorizes only a future request for human-operated, read-only preflight execution in `Admate_AI_MMP`.

It does not authorize:

- DB connection by Codex.
- SQL execution by Codex.
- schema draft execution.
- rollback execution.
- migration application.
- production env changes.
- API/code changes.
- raw data upload or export.
- Meta API sync.
- Python retrain.
- LLM use on raw campaign-level data.
