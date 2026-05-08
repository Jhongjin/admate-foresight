# AdMate Foresight Benchmark Production Preflight Result Capture Guide v1

작성일: 2026-05-08

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Data Core production에서 Foresight benchmark schema migration 전 read-only preflight 결과를 캡처하기 위한 운영자 가이드다.

이번 Gate는 SQL 파일과 결과 캡처 가이드 준비만 수행한다. Codex는 SQL 실행, DB 연결, schema/migration 적용, production env 변경, 코드/API/env 수정, Meta API 호출, Python retrain, LLM 호출을 수행하지 않는다.

## 2. Files

Prepared SQL file:

```text
docs/sql/2026-05-08_foresight_benchmark_production_preflight.sql
```

The SQL file is SELECT-only and is intended for metadata preflight in the approved AdMate Data Core production target.

## 3. Execution Boundary

Allowed for the human operator in a later approved Gate:

- run only the prepared production preflight SQL.
- run one block at a time in Supabase SQL Editor.
- capture sanitized result values only.

Not allowed:

- any non-SELECT SQL.
- schema draft execution.
- rollback execution.
- migration execution.
- raw row inspection.
- secret, env, provider, session, or connection value output.

Production schema apply remains forbidden until a later explicit approval Gate.

## 4. Block-by-block Capture Method

Supabase SQL Editor may show or copy only the last result grid when multiple statements run together. To avoid losing evidence:

1. Open `docs/sql/2026-05-08_foresight_benchmark_production_preflight.sql`.
2. Confirm the SQL Editor target is AdMate Data Core production.
3. Select one `select ...;` block at a time.
4. Run the selected block only.
5. Copy the sanitized result for that block.
6. Repeat for every `check_group`.
7. Do not paste raw data, credential-bearing URLs, or screenshots with unsafe values.

If a block returns no rows, report `no rows`.

## 5. Required Result Blocks

| Block | Required result |
| --- | --- |
| `current_database_schema` | current database, schema, role category, server version |
| `production_target_warning` | production-looking warning and manual confirmation |
| `foresight_schema_count` | existing `foresight` schema count |
| `existing_draft_table_count` | conflict count for five draft table names |
| `existing_foresight_object_inventory` | existing `foresight` object list or `no rows` |
| `extension_availability` | `pgcrypto` and `uuid-ossp` availability |
| `auth_users_availability` | `auth.users` table count |
| `openclaw_schema_table_baseline` | sanitized openclaw table baseline |
| `openclaw_account_model_candidates` | metadata-only account model candidate list |
| `broad_anon_public_policy_count` | broad ordinary policy count |
| `broad_anon_public_policy_baseline` | broad ordinary policy details or `no rows` |
| `broad_grants_baseline` | broad ordinary grant details or `no rows` |
| `existing_foresight_policy_residue` | `foresight` policy residue or `no rows` |
| `existing_foresight_grant_residue` | `foresight` grant residue or `no rows` |
| `production_preflight_summary` | recommended action |

## 6. Sanitized Result Template

Use this template after block-by-block capture.

```text
Gate Foresight-Benchmark-22 production read-only preflight result

target_confirmation:
  target_label:
  dashboard_target_confirmed:
  sql_editor_target_confirmed:
  production_preflight_intent_confirmed:
  schema_apply_executed:
  blocking_warning_error:

current_database_schema:
  current_database_name:
  current_schema_name:
  current_role_category:
  server_version:

production_warning:
  target_warning:
  manual_confirmation:

foresight_conflict:
  foresight_schema_count:
  existing_draft_table_count:
  existing_foresight_object_inventory:
  existing_foresight_policy_residue:
  existing_foresight_grant_residue:
  conflict_status:

extension_availability:
  pgcrypto:
  uuid_ossp:
  extension_blocker:

auth_actor_strategy:
  auth_users_table_count:
  direct_auth_fk_required:
  soft_uuid_strategy_acceptable:
  actor_strategy_blocker:

openclaw_account_model:
  openclaw_schema_table_baseline:
  openclaw_account_model_candidates:
  account_model_compatibility:
  tenant_or_account_fk_required_before_migration:
  compatibility_blocker:

policy_grant_baseline:
  broad_anon_public_policy_count:
  broad_anon_public_policy_baseline:
  broad_grants_baseline:
  broad_access_risk:

sql_editor_status:
  error_summary:
  warning_summary:
  output_redaction_status:

preflight_summary:
  recommended_action:

decision_request:
  proceed_to_migration_runbook:
  blocked:
  blockers:
  notes_sanitized:
```

## 7. Stop Conditions

Stop the preflight and do not proceed to migration planning if:

- target is uncertain.
- SQL Editor target is not the intended AdMate Data Core production project.
- production preflight intent is not confirmed.
- an existing draft table conflict appears.
- existing `foresight` objects cannot be classified.
- auth or actor strategy is incompatible with the draft.
- openclaw/account model requires schema changes first.
- broad ordinary grants or policies introduce access risk.
- SQL Editor warning or error indicates unsafe target state.
- result capture would expose credentials, raw data, or unsafe identifiers.
- `production_preflight_summary` returns any `STOP` result.

## 8. Reporting Safety

Allowed:

- yes/no confirmations.
- counts.
- sanitized object names.
- `no rows` statements.
- sanitized warning summaries.
- pass/blocked decisions.

Forbidden:

- connection strings.
- service credential values.
- credential-bearing URLs.
- passwords.
- provider credential values.
- session values.
- raw campaign-level rows.
- raw provider responses.
- advertiser, account, campaign, ad set, ad, or personal identifiers.

## 9. Next Gate

Recommended next Gate:

```text
Foresight-Benchmark-22 production read-only preflight execution
```

If blockers appear:

```text
Foresight-Benchmark-22B production preflight blocker review
```

Production schema apply remains forbidden until a later explicit approval Gate.
