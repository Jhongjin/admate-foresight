# AdMate Foresight Benchmark Production Preflight Plan v1

작성일: 2026-05-08

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 AdMate Data Core production에서 Foresight benchmark schema migration 전 read-only preflight를 어떻게 수행할지 계획한다.

이번 Gate는 preflight 계획 문서화만 수행한다. SQL 실행, DB 연결, schema/migration 적용, production env 변경, 코드/API/env 수정, Meta API 호출, Python retrain, LLM 호출은 수행하지 않는다.

## 2. Current Decision Context

Benchmark-20 decision:

```text
production preflight planning: go
production schema apply: blocked
```

Known evidence:

- MMP schema dry-run passed.
- MMP rollback rehearsal passed.
- MMP post-rollback residue check passed.
- MMP draft table row counts were all `0`.
- MMP broad anon policy count was `0`.
- Index expectation is corrected:
  - explicit draft indexes: `23`.
  - total matching `pg_indexes` rows after apply: `29`, including implicit primary key and unique constraint indexes.

This evidence supports production preflight planning only. It does not approve production migration.

## 3. Target

Preflight target:

```text
AdMate-Data-Core production
```

Required target handling:

- The operator must verify the production Supabase Dashboard project directly.
- The SQL Editor target must be the confirmed AdMate Data Core production project.
- The target must not be `Admate_AI_MMP`.
- The target must not be any local, staging, or disposable project.
- Target confirmation must be recorded as sanitized labels only.

If the target is uncertain, stop before running any SQL.

## 4. Preflight Objectives

Production read-only preflight must answer these questions before any schema apply is considered.

| Objective | What to confirm | Stop if |
| --- | --- | --- |
| Target confirmation | SQL Editor target is AdMate Data Core production | target is ambiguous |
| Existing `foresight` conflict | schema, tables, indexes, policies, grants, or objects already exist | non-disposable conflict exists |
| Extension availability | `pgcrypto` / `uuid-ossp` status and current draft dependency assumptions | required extension cannot be used |
| `auth.users` availability | hosted auth table exists and actor strategy can remain soft UUID | direct FK is required but not approved |
| Openclaw/account model compatibility | production account/tenant/user ownership model does not conflict with soft actor references | model requires a different FK/tenant design before migration |
| Broad anon/public baseline | no broad ordinary-user policy/grant risk for target namespace | broad read/write exposure exists |
| Existing policies/grants baseline | production grant/policy posture is understood before schema apply | baseline cannot be safely reviewed |
| Production-looking warning | production target is intentionally selected and manually confirmed | production target was selected accidentally |
| SQL Editor warning/error | no blocking warning/error before or during preflight | warning/error indicates unsafe target state |

## 5. Allowed SQL Boundary

Allowed:

- read-only `SELECT` statements only.
- metadata inventory queries against system catalogs and information schema.
- result capture as counts, yes/no values, sanitized object names, and sanitized warning summaries.

Forbidden:

- `CREATE`
- `ALTER`
- `DROP`
- `INSERT`
- `UPDATE`
- `DELETE`
- `TRUNCATE`
- function execution with side effects.
- schema draft execution.
- rollback execution.
- verify SQL intended for post-apply state.
- ad hoc data inspection of raw campaign rows.
- secret/env/provider/session value output.

Production preflight must not become production migration.

## 6. Preflight Result Areas

### 6.1 Target Confirmation

Required result:

| Field | Required value |
| --- | --- |
| Dashboard project label | AdMate Data Core production confirmed |
| SQL Editor target | same production project |
| Operator identity | sanitized operator label only |
| Production selection | intentional and approved for read-only preflight |
| SQL file/scope | read-only preflight only |
| Blocking warning/error | none |

Do not include project URLs, connection strings, service credentials, or screenshots containing unsafe values.

### 6.2 Existing `foresight` Schema/Table Conflict

Required result:

| Field | Expected safe result |
| --- | --- |
| `foresight` schema count | `0`, or existing schema fully reviewed before apply |
| draft table conflict count | `0` |
| existing object inventory | no conflicting `foresight` objects |
| existing index/policy/grant inventory | no conflict with draft objects |
| namespace owner | Data Core owner approved |

Stop if:

- any of the five draft tables already exist.
- existing `foresight` objects cannot be classified.
- rollback would be unable to distinguish draft objects from existing production objects.

### 6.3 Extension Availability

Required result:

| Extension | Required status |
| --- | --- |
| `pgcrypto` | available or not required by current draft |
| `uuid-ossp` | optional unless a later draft requires it |

Current draft note:

- The current schema draft supplies UUID values and does not require generated UUID defaults.
- Extension absence is not a blocker unless the production draft changes.

### 6.4 `auth.users` Availability

Required result:

| Field | Required status |
| --- | --- |
| `auth.users` table availability | available preferred |
| direct FK requirement | not required for current draft |
| actor strategy | soft UUID references approved or explicitly reviewed |

Stop if:

- production reviewers require direct `auth.users` FK before the Data Core / Agent Core ownership decision.
- soft UUID references are rejected.

### 6.5 Openclaw / Account Model Compatibility

Required result:

| Field | Required status |
| --- | --- |
| `openclaw` schema presence | recorded as sanitized count/object summary |
| account/tenant/user model | compatible with soft actor references or explicitly deferred |
| ordinary user access path | no direct table access implied by migration |
| report-safe serving boundary | deferred to future API/view/RLS Gate |

The preflight should not inspect production account rows. It should record metadata-level compatibility only.

Stop if:

- production account model requires tenant/account foreign keys that the draft does not include.
- migration would create tables that bypass existing Data Core ownership or access model.
- report/API access expectations require policies not present in the draft.

### 6.6 Policy / Grant Baseline

Required result:

| Field | Expected safe result |
| --- | --- |
| existing `foresight` policies | none, or reviewed safe |
| grants to `anon` / `public` / ordinary roles | none or explicitly reviewed safe |
| broad read/write policy risk | none |
| service/internal role assumptions | recorded without secret values |

Stop if:

- broad anon/public read/write access exists.
- policies/grants cannot be explained before migration.
- ordinary user access would be broader than the default-deny expectation.

### 6.7 Production-looking Warning

Production-looking target detection must be recorded, but in this Gate production is the intended target for read-only preflight.

Required result:

| Field | Required status |
| --- | --- |
| target warning | production-looking warning acknowledged |
| manual confirmation | operator confirms production preflight is intentional |
| migration approval | not granted by preflight |

Stop if:

- production was not intentionally selected.
- operator cannot distinguish Data Core production from another project.

## 7. Result Submission Template

Use this sanitized template after production read-only preflight.

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

foresight_conflict:
  foresight_schema_count:
  existing_draft_table_count:
  existing_foresight_object_summary:
  existing_foresight_policy_summary:
  existing_foresight_grant_summary:
  conflict_status:

extension_availability:
  pgcrypto:
  uuid_ossp:
  extension_blocker:

auth_actor_strategy:
  auth_users_availability:
  direct_auth_fk_required:
  soft_uuid_strategy_approved_for_preflight:
  actor_strategy_blocker:

openclaw_account_model:
  openclaw_schema_summary:
  account_model_compatibility:
  tenant_or_account_fk_required_before_migration:
  compatibility_blocker:

policy_grant_baseline:
  broad_anon_public_policy_count:
  ordinary_role_grant_summary:
  broad_access_risk:

production_warning:
  production_like_warning:
  manual_confirmation:

sql_editor_status:
  error_summary:
  warning_summary:
  output_redaction_status:

decision_request:
  proceed_to_migration_runbook:
  blocked:
  blockers:
  notes_sanitized:
```

Allowed values:

- yes/no.
- counts.
- sanitized object names.
- no-rows statements.
- pass/blocked decisions.
- sanitized warning/error summaries.

Forbidden values:

- connection strings.
- service credentials.
- credential-bearing URLs.
- passwords.
- provider tokens.
- session values.
- raw campaign rows.
- raw provider responses.
- advertiser, account, campaign, ad set, ad, or personal identifiers.

## 8. Stop Conditions

Stop the preflight and do not proceed to migration planning if:

- target is uncertain.
- SQL Editor target is not the intended AdMate Data Core production project.
- the operator cannot confirm production preflight intent.
- any existing `foresight` draft table conflict exists.
- existing `foresight` objects cannot be safely classified.
- auth/actor strategy is incompatible with the draft.
- openclaw/account model requires schema changes before migration.
- broad anon/public grants or policies create access risk.
- SQL Editor warning/error indicates unsafe target state.
- result capture would expose secrets or raw data.

Stop conditions should be reported as sanitized blocker notes only.

## 9. Approval Checklist Before Production Schema Apply

Preflight success is not enough for production schema apply.

Production schema apply requires:

- production preflight result accepted.
- Data Core owner approval.
- Foresight product/data owner approval.
- security/governance approval.
- rollback approver named.
- backup/export or restore point expectation approved.
- exact SQL files and execution order approved.
- index expectation corrected: explicit `23`, total `29`.
- RLS default-deny posture accepted.
- no app/user access policies enabled without separate approval.
- actor/auth strategy accepted as soft UUID references for initial migration.
- raw retention and source evidence policy accepted.

## 10. Next Gate

Recommended next Gate:

```text
Foresight-Benchmark-22 production read-only preflight execution
```

If blockers appear:

```text
Foresight-Benchmark-22B production preflight blocker review
```

Production schema apply remains forbidden until a later explicit approval Gate.

## 11. Final Boundary

This plan authorizes only preparation for a future read-only production preflight.

It does not authorize:

- production SQL execution in this Gate.
- production schema/migration apply.
- production env changes.
- raw benchmark data import.
- DB import/export automation.
- Meta API sync.
- Python retrain.
- LLM processing of raw campaign-level data.
