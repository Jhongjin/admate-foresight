# AdMate Foresight Benchmark Nonprod Preflight SQL Review v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Benchmark-13 nonprod preflight and verify SQL preparation

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark schema non-production dry-run을 위한 preflight SQL, verify SQL, post-rollback verify SQL의 목적과 실행 순서를 정리한다.

이번 Gate는 SQL 파일 준비만 수행한다. SQL 실행, DB 연결, migration/schema 적용, production env 변경, 코드/API 수정, raw Excel/CSV/model artifact 추가, Meta API 호출, Python retrain은 수행하지 않는다.

작성 파일:

- `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql`
- `docs/strategy/AdMate_Foresight_Benchmark_Nonprod_Preflight_SQL_Review_v1.md`

핵심 원칙:

```text
Prepare read-only SQL.
Run nothing in this Gate.
Use only approved non-production targets in a later Gate.
Stop if the target looks production-like or unclear.
```

## 2. SQL File Purposes

### 2.1 Nonprod Preflight SQL

File:

```text
docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql
```

Purpose:

- confirm current database/schema context.
- surface target-name warnings that look production-like.
- inventory `foresight` schema and draft table conflicts.
- check required extension availability.
- check `auth.users` availability without binding to it.
- capture existing policy/grant baseline.
- recommend stop/proceed review status.

Expected use:

- run before any schema draft rehearsal in a later approved Gate.
- results must be reviewed by an operator before proceeding.

### 2.2 Nonprod Verify SQL

File:

```text
docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql
```

Purpose:

- confirm expected table count.
- confirm RLS enabled count.
- list and count candidate indexes.
- summarize constraints.
- confirm FK relationships and soft actor reference posture.
- confirm row counts are zero.
- detect broad anonymous/public policies.
- verify key table/column existence.

Expected use:

- run only after an approved non-production schema draft rehearsal.
- do not run against production.

### 2.3 Nonprod Post-rollback Verify SQL

File:

```text
docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql
```

Purpose:

- confirm target draft tables are absent after rollback rehearsal.
- confirm candidate indexes and policies are absent.
- show remaining `foresight` objects, if any.
- provide non-foresight schema table counts as a sanity baseline.

Expected use:

- run only after rollback rehearsal in an approved non-production execution Gate.
- output should be included in a sanitized dry-run result report.

## 3. Execution Order

Recommended later Gate order:

1. Operator confirms non-production target and secret-safe handling.
2. Run `nonprod_preflight.sql`.
3. Review preflight outputs and stop conditions.
4. If approved, run the schema draft SQL in non-production.
5. Run `nonprod_verify.sql`.
6. Review verification outputs.
7. Confirm row count and backup/export guard.
8. Run rollback draft in non-production.
9. Run `nonprod_post_rollback_verify.sql`.
10. Produce sanitized result report.

This Gate performs none of the above execution steps.

## 4. Stop Conditions

Stop immediately if:

- target is production or target identity is unclear.
- target name looks production-like and cannot be cleared by operator review.
- `foresight` schema contains non-disposable objects.
- any draft target table already exists without reset/retry approval.
- `auth.users` direct FK is expected by stakeholders.
- RLS cannot be enabled in the target.
- broad anonymous/public policy exists for candidate tables.
- row count is not zero after draft rehearsal.
- rollback rehearsal leaves draft tables or indexes behind.
- connection details, service role, password, token, or URL would be exposed.
- raw campaign data or production storage is attached to the target.

Stop means:

- do not continue manually.
- record sanitized reason.
- return to planning/review.

## 5. SQL Editor Cautions

When a later Gate approves SQL Editor usage:

- confirm target project is non-production before opening the editor.
- avoid copying connection strings or credentials into notes.
- paste only the approved read-only SQL file for the current step.
- run preflight before any schema draft rehearsal.
- keep result screenshots/transcripts sanitized.
- do not include raw row output in reports.
- do not run all files as one batch.
- do not run post-rollback verify before rollback rehearsal.
- stop on the first unexpected result.

## 6. Secret and Env Output Boundary

Do not output:

- connection strings.
- service role values.
- database passwords.
- session tokens.
- project URLs if treated as sensitive.
- provider credentials.
- env file contents.
- raw source rows.

Allowed output:

- sanitized counts.
- table and column names from the draft.
- policy names without sensitive payload.
- role names such as `anon` or `authenticated` when needed for access review.
- pass/fail status and stop reason.

## 7. Production Direct Execution Ban

Production direct execution is forbidden.

Production readiness requires:

- successful non-production preflight.
- successful non-production draft rehearsal.
- successful verify SQL.
- successful rollback rehearsal.
- successful post-rollback verify.
- backup/export plan.
- reviewer role source decision.
- retention policy decision.
- Data Core target schema decision.
- separate API implementation plan.

The prepared SQL files do not make production ready.

## 8. Review Checklist

Before moving to a later execution Gate, confirm:

- all three SQL files are read-only.
- no mutating or object-definition SQL is present in the preflight/verify files.
- preflight stop conditions are understood.
- SQL Editor operator knows not to use production.
- result report template is agreed.
- rollback rehearsal will run after row count guard.
- outputs will be sanitized before sharing.

## 9. Follow-up Gates

### Foresight-Benchmark-14: Nonprod Dry-run Execution

Scope candidate:

- run approved preflight, schema draft, verify, rollback rehearsal, and post-rollback verify in selected non-production target.
- no production target.
- no raw data.
- no API/code changes.

### Foresight-Benchmark-15: Production Readiness Review

Scope candidate:

- review non-production execution outputs.
- decide remaining blockers.
- determine whether a real migration plan can be prepared.

### Foresight-Benchmark-16: Dry-run Report API Implementation Plan

Scope candidate:

- plan guarded API after schema/report storage and non-production rehearsal results are reviewed.
- include auth, audit, rate limit, no-store response, request size limit, and redaction.

## 10. Final Recommendation

Benchmark-13 recommends:

```text
1. Keep the prepared SQL files read-only.
2. Use them only in approved non-production execution.
3. Stop on production-like targets, conflicts, broad policies, nonzero rows,
   rollback residue, or secret exposure risk.
4. Treat the outputs as evidence for production readiness review, not as
   production approval.
```
