# AdMate Foresight Benchmark MMP Preflight Result Capture Guide v1

작성일: 2026-05-07

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 `Admate_AI_MMP` SQL Editor에서 실행한 read-only preflight 결과를 빠짐없이 수집하기 위한 가이드다.

현재 사용자가 가져온 결과는 `preflight_summary` 한 줄뿐이므로, `Admate_AI_MMP` fallback을 schema dry-run 대상으로 진행할 수 없다. Schema draft, verify SQL, rollback SQL, DB/schema/migration 적용은 계속 금지한다.

## 2. Current Decision

현재 판정:

```text
blocked
```

Blocked reason:

- `preflight_summary` 한 줄만으로는 target, schema conflict, extension, auth, policy, grant, SQL warning/error 상태를 검증할 수 없다.
- schema dry-run 진행 여부를 판단하려면 full read-only preflight result capture가 필요하다.

## 3. Execution Boundary

This guide does not authorize Codex or the operator to run additional SQL beyond the approved read-only preflight capture step.

Allowed in a later human-operated capture step:

- Run only `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql` in `Admate_AI_MMP`.
- Copy sanitized result values into the tables below.

Forbidden:

- schema draft execution.
- verify SQL execution.
- rollback SQL execution.
- DB/schema/migration apply.
- production env change.
- code/API change.
- raw artifact upload.
- Meta API call.
- Python retrain.
- copying connection strings, credentials, session URLs, raw campaign rows, provider responses, or secret-like values.

## 4. Required Result Tables

The operator should return all eight result groups below. If any group is missing, the decision remains `blocked`.

### 4.1 Current Database / Schema

Purpose:

- confirm the SQL Editor target context.
- detect production-looking target names before any schema dry-run.

Expected source from preflight SQL:

```text
current_database_name
current_schema_name
current_role_name
server_version
```

Result to provide:

| Field | Sanitized value | Required? | Notes |
| --- | --- | --- | --- |
| current database name |  | yes | Do not include credential-bearing URL. |
| current schema name |  | yes | Usually `public` or SQL session default. |
| current role category |  | yes | Provide role category/name only if safe. |
| server version |  | yes | Major/minor version is enough. |

Stop if:

- database name is production-looking.
- SQL Editor target is ambiguous.
- role appears production privileged and unapproved.

### 4.2 Schema / Table Conflict

Purpose:

- confirm whether `foresight` already exists.
- confirm whether any proposed benchmark draft table already exists.

Expected source from preflight SQL:

```text
foresight_schema_count
existing table list for table_schema = 'foresight'
existing_draft_table_count
existing object inventory for nspname = 'foresight'
```

Result to provide:

| Field | Sanitized value | Required? | Expected clean result |
| --- | --- | --- | --- |
| `foresight` schema count |  | yes | `0`, or `1` only if owner-approved disposable. |
| `foresight` table count/list |  | yes | Empty, or clearly disposable and non-conflicting. |
| existing draft table count |  | yes | `0` |
| existing object summary |  | yes | Empty, or non-draft objects explicitly reviewed. |

Stop if:

- any of the five benchmark draft tables already exist.
- `foresight` contains non-disposable objects.
- object ownership cannot be classified.

### 4.3 Extension Availability

Purpose:

- capture `pgcrypto` and `uuid-ossp` state.
- confirm no extension blocker exists for the current draft assumptions.

Expected source from preflight SQL:

```text
extension_name
extension_version
```

Result to provide:

| Extension | Present? | Version if safe | Notes |
| --- | --- | --- | --- |
| `pgcrypto` |  |  | Preferred future candidate if UUID generation defaults are added. |
| `uuid-ossp` |  |  | Optional unless a later draft depends on it. |

Current draft note:

- The current schema draft uses supplied UUID values and soft actor references.
- Missing extension is not automatically a blocker unless the draft changes to require extension-backed defaults.

Stop if:

- a later draft revision requires an extension that is not available.
- extension installation would require production-like elevated permission.

### 4.4 `auth.users` Availability

Purpose:

- confirm whether hosted Supabase auth table exists.
- validate whether soft UUID actor strategy remains compatible.

Expected source from preflight SQL:

```text
auth_users_table_count
```

Result to provide:

| Field | Sanitized value | Required? | Expected clean result |
| --- | --- | --- | --- |
| `auth.users` table count |  | yes | `1` preferred, `0` requires soft-reference-only review. |
| direct FK required? |  | yes | Expected: no. |
| actor strategy status |  | yes | Expected: soft UUID references remain acceptable. |

Stop if:

- direct `auth.users` FK becomes required for this dry-run.
- `auth.users` is unavailable and reviewers reject soft UUID reference strategy.

### 4.5 Existing `foresight` Schema / Table Count

Purpose:

- summarize the `foresight` namespace state independently from conflict checks.

Result to provide:

| Field | Sanitized value | Required? | Expected clean result |
| --- | --- | --- | --- |
| schema exists? |  | yes | no, or yes with owner-approved disposable status. |
| table count |  | yes | `0` preferred. |
| object count by type |  | yes | Empty preferred. |
| owner-approved disposable status |  | yes | yes if anything exists. |

Stop if:

- existing schema/table count is non-zero and owner approval is missing.
- rollback would be able to affect non-draft objects.

### 4.6 Policy / Grant Baseline

Purpose:

- detect ordinary-user exposure risk before schema dry-run.
- identify broad policy/grant conditions that could make a fallback project unsafe.

Expected source from preflight SQL:

```text
pg_policies where schemaname = 'foresight'
role_table_grants where table_schema = 'foresight'
```

Result to provide:

| Field | Sanitized value | Required? | Expected clean result |
| --- | --- | --- | --- |
| policy count |  | yes | `0`, or reviewed safe policies only. |
| policy roles summary |  | yes | No broad `anon` or `public` exposure. |
| policy command summary |  | yes | No unexpected broad read/write. |
| grant count to ordinary roles |  | yes | `0`, or reviewed safe grants only. |
| grant privilege summary |  | yes | No broad read/write grants. |

Stop if:

- broad `anon`, `public`, or ordinary-user read/write policy exists.
- grants expose future benchmark tables or existing `foresight` objects broadly.
- policy/grant output cannot be sanitized.

### 4.7 Production-looking Warning

Purpose:

- confirm the target name does not look like production.
- decide whether manual target review can continue.

Expected source from preflight SQL:

```text
target_warning
recommended_action in preflight_summary
```

Result to provide:

| Field | Sanitized value | Required? | Expected clean result |
| --- | --- | --- | --- |
| target warning |  | yes | `review target name manually` |
| preflight summary action |  | yes | `preflight review required before apply rehearsal` |
| target manually confirmed as `Admate_AI_MMP` |  | yes | yes |
| target manually confirmed not production |  | yes | yes |

Stop if:

- target warning says `STOP`.
- target manual confirmation is missing.
- project name/ref is ambiguous.

### 4.8 SQL Error / Warning Status

Purpose:

- capture whether Supabase SQL Editor raised any execution warning or error.
- keep the next decision blocked if the preflight itself did not run cleanly.

Result to provide:

| Field | Sanitized value | Required? | Expected clean result |
| --- | --- | --- | --- |
| SQL executed exactly once? |  | yes | yes |
| SQL file used |  | yes | `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql` |
| SQL Editor error |  | yes | none |
| SQL Editor warning |  | yes | none, or sanitized non-blocking warning |
| Any output redacted? |  | yes | yes/no with reason, no values |

Stop if:

- SQL Editor reports an error.
- warnings indicate permission, target, policy, or production ambiguity.
- operator used a different SQL file.
- result cannot be shared safely without unsafe values.

## 5. One-message Capture Template

The user can paste a completed version of this template into the next message.

```text
Gate Foresight-Benchmark-17A MMP full read-only preflight result

execution_boundary:
  project_label: Admate_AI_MMP
  sql_editor_target_confirmed:
  not_admate_data_core_production:
  sql_file_executed:
  schema_draft_executed:
  verify_sql_executed:
  rollback_sql_executed:

current_database_schema:
  current_database_name:
  current_schema_name:
  current_role_category:
  server_version:

schema_table_conflict:
  foresight_schema_count:
  foresight_table_count_or_list:
  existing_draft_table_count:
  existing_object_summary:

extension_availability:
  pgcrypto:
  uuid_ossp:
  extension_blocker:

auth_users_availability:
  auth_users_table_count:
  direct_fk_required:
  soft_uuid_strategy_acceptable:

existing_foresight_count:
  schema_exists:
  table_count:
  object_count_by_type:
  owner_approved_disposable:

policy_grant_baseline:
  policy_count:
  policy_roles_summary:
  policy_command_summary:
  ordinary_role_grant_count:
  grant_privilege_summary:
  broad_policy_or_grant_risk:

production_warning:
  target_warning:
  preflight_summary_action:
  manual_target_review:

sql_error_warning:
  executed_exactly_once:
  sql_editor_error:
  sql_editor_warning:
  redaction_applied:

operator_decision_request:
  requested_decision: proceed / blocked / needs revision
  notes_sanitized:
```

Use counts, yes/no values, and sanitized object names only. Do not paste credential-bearing URLs, connection strings, keys, session values, raw campaign data, raw provider responses, or screenshots that contain unsafe values.

## 6. Review Decision Logic

### 6.1 Proceed

The next review can recommend `proceed` to a schema dry-run plan only if:

- all eight result groups are provided.
- project is confirmed as `Admate_AI_MMP`.
- project is confirmed not production.
- only the preflight SQL was executed.
- `target_warning` and `preflight_summary` do not say `STOP`.
- existing draft table count is `0`.
- no non-disposable `foresight` objects exist.
- `auth.users` status is compatible with soft UUID references.
- no broad ordinary-role policy/grant risk exists.
- SQL Editor error/warning status is clean or clearly non-blocking.

### 6.2 Blocked

Keep the decision `blocked` if:

- any required result group is missing.
- target confirmation is missing.
- production exclusion is missing.
- schema/table conflict is unresolved.
- policy/grant baseline is missing.
- SQL Editor error/warning status is missing.
- output safety is unclear.

### 6.3 Needs Revision

Use `needs revision` if:

- fallback can remain viable but SQL draft assumptions need edits.
- schema name must change for disposable MMP testing.
- extension assumptions changed.
- verify SQL would not match the fallback schema.
- actor strategy comments or constraints need adjustment before schema dry-run.

### 6.4 Fallback Rejected

Reject `Admate_AI_MMP` fallback if:

- target appears production-like or ambiguous.
- broad policies/grants make fallback unsafe.
- existing `foresight` objects are shared or non-disposable.
- owner approval is missing for existing schema/object state.
- sanitized reporting is impossible.

## 7. Next Gate Recommendation

Recommended next Gate after the user returns the full table:

- `Foresight-Benchmark-17B MMP full preflight result review`

Possible outcomes of that Gate:

- clean result: `Foresight-Benchmark-18 MMP schema dry-run execution plan`
- incomplete result: repeat `Foresight-Benchmark-17A` capture
- conflict/risk result: `Foresight-Benchmark-18 MMP fallback rejection or SQL draft revision review`

Do not proceed directly from this capture guide to schema draft execution.
