# AdMate Foresight Benchmark Selected Environment Readiness Check v1

작성일: 2026-05-07

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 Foresight benchmark schema dry-run migration을 실행할 non-production 환경을 최종 선택하기 전, `local Supabase`와 `Admate_AI_MMP disposable schema` fallback의 준비 가능성을 read-only로 점검한다.

이번 Gate에서는 DB 연결, SQL 실행, migration 적용, schema 변경, production env 변경, 코드/API 수정, Meta API 호출, Python retrain 실행을 하지 않는다.

## 2. Inputs Reviewed

- `docs/strategy/AdMate_Foresight_Benchmark_Nonprod_Dry_Run_Migration_Plan_v1.md`
- `docs/strategy/AdMate_Foresight_Benchmark_Nonprod_Preflight_SQL_Review_v1.md`
- `docs/strategy/AdMate_Foresight_Benchmark_Nonprod_Environment_Decision_v1.md`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_verify.sql`
- `docs/sql/2026-05-07_foresight_benchmark_nonprod_post_rollback_verify.sql`
- `docs/sql/2026-05-07_foresight_benchmark_schema_draft.sql`
- `docs/sql/2026-05-07_foresight_benchmark_schema_rollback_draft.sql`

## 3. Local Tooling Snapshot

Read-only local command availability check result:

| Tool | Result | Readiness meaning |
| --- | --- | --- |
| Supabase CLI | Not found in current shell PATH | Local Supabase dry-run cannot start until CLI is installed or made available. |
| Docker CLI | Not found in current shell PATH | Local Supabase stack cannot be started until a compatible container runtime is available. |

No DB connection, local container start, SQL execution, or env value inspection was performed.

## 4. Candidate 1: Local Supabase Readiness

### 4.1 Supabase CLI

Current readiness: blocked.

The local shell does not expose the Supabase CLI. Local Supabase remains the safest execution target in principle, but it is not immediately executable from the current environment until the CLI is installed, added to PATH, or an approved bundled runtime is selected.

Readiness requirement before execution:

- Supabase CLI is available.
- CLI version is recorded without printing local install paths.
- The selected command uses local-only configuration and does not read production env files.
- The dry-run operator confirms that no production service role, provider token, or project credential is loaded.

### 4.2 Local Postgres and Containers

Current readiness: blocked.

Docker CLI is not available from the current shell. A local Supabase dry-run normally requires a local Postgres/Auth stack through Supabase-managed containers or an equivalent approved local runtime.

Readiness requirement before execution:

- Container runtime is available and approved for local Supabase.
- Local stack can be initialized without using production project credentials.
- Local database starts empty or in a disposable state.
- Any local reset or teardown command is reviewed before use.

### 4.3 `auth.users` Compatibility

Local Supabase is the best candidate for validating `auth.users` compatibility without production risk, because it can provide the same logical auth schema shape in an isolated environment.

Important caveat:

- The current review SQL must confirm `auth.users` availability before applying the schema draft.
- The schema draft should continue to use soft UUID references unless the AdMate Data Core target schema explicitly approves direct `auth.users` foreign keys.
- If local auth tables are unavailable, the dry-run should stop or use the soft-reference-only path.

### 4.4 Extension Candidates

The current schema draft does not require an extension-backed UUID default to execute. If later SQL changes introduce `gen_random_uuid()` defaults, `pgcrypto` should be treated as the preferred extension candidate and checked by preflight before migration.

`uuid-ossp` should remain optional unless a later schema draft explicitly depends on it.

### 4.5 Rollback Rehearsal

Local Supabase is the strongest rollback rehearsal environment once tooling exists.

Expected advantages:

- Disposable database state.
- No production data exposure.
- Easy repeat of apply, verify, rollback, and post-rollback verify.
- Lower risk when testing reverse-order drops from the rollback draft.

Stop condition:

- If local stack cannot be reset or verified as disposable, do not proceed.

### 4.6 Secret-Safe Execution

Local Supabase can be secret-safe if the operator follows these requirements:

- Do not load `.env`, `.env.local`, production deployment env, service role keys, Meta tokens, or provider tokens.
- Do not print connection strings or credential-bearing CLI output.
- Do not connect the local CLI to production or shared remote projects.
- Run only the approved preflight, draft, verify, rollback, and post-rollback verify files in the approved order.

### 4.7 Local Supabase Readiness Decision

Local Supabase remains the preferred environment for the first full dry-run, but it is currently blocked by missing local CLI/container tooling in this shell.

Decision:

- Priority: first choice after tooling readiness is restored.
- Current state: not ready to execute.
- Next action before any execution: install/enable Supabase CLI and compatible container runtime, then rerun tool availability checks without printing local paths or secrets.

## 5. Candidate 2: `Admate_AI_MMP` Disposable Schema Fallback Readiness

### 5.1 Alignment with Benchmark-14

Benchmark-14 classified an existing non-critical project disposable schema as a conditional fallback, not the preferred path. That conclusion still stands.

`Admate_AI_MMP` may be considered only when:

- Local Supabase remains blocked.
- The project owner confirms the project is non-production and non-critical for this dry-run.
- The selected schema is disposable and isolated from existing app data.
- The first operation is preflight read-only SQL only.

### 5.2 Disposable Schema Name Candidate

Recommended disposable schema name candidate:

- `foresight_benchmark_dryrun_20260507`

Acceptable alternate:

- `foresight_benchmark_dryrun_v1`

Do not reuse `public`, existing app schemas, or a generic `foresight` schema in this fallback path unless the owner explicitly confirms there is no conflict. The production-oriented draft uses `foresight` as a proposal; the fallback should make disposable status unmistakable.

### 5.3 Production Confusion Prevention

Before using `Admate_AI_MMP` as fallback, the operator must confirm:

- The target is not AdMate Data Core production.
- The SQL editor/session clearly displays the intended non-critical project.
- No production credentials, service role values, storage buckets, app secrets, or provider tokens are used.
- The dry-run actor has permission to test only the disposable schema.
- The result report records the project label and schema name without storing credentials.

Stop immediately if the target looks production-like, contains production naming, or cannot be distinguished from AdMate Data Core.

### 5.4 Preflight-Only First Condition

The fallback must begin with `docs/sql/2026-05-07_foresight_benchmark_nonprod_preflight.sql` only.

Proceed no further if preflight shows:

- Existing schema/table conflicts.
- Missing or incompatible `auth.users` strategy.
- Unexpected broad anonymous policies.
- Existing grants that would expose benchmark data to ordinary users.
- Inability to confirm row count and policy baseline safely.
- Any output that appears to contain secrets, tokens, raw provider response, or raw campaign-level data.

### 5.5 Existing Public Documents/Chunks Conflict Avoidance

The fallback must not touch existing document, chunk, embedding, vector, storage, or retrieval tables that may already support other AdMate work.

Conflict avoidance requirements:

- Do not create tables in `public`.
- Do not alter `public.documents`, `public.chunks`, embeddings, vector indexes, or retrieval policies.
- Do not modify existing storage buckets, functions, triggers, or policies.
- Use a disposable benchmark-only schema.
- Limit rollback to the dry-run schema objects created by this review.

If existing public documents/chunks are discovered during preflight, that is not automatically a blocker, but any overlap with the target schema, names, policies, or grants is a blocker.

### 5.6 Rollback Rehearsal

Rollback rehearsal is possible in `Admate_AI_MMP` only if:

- The disposable schema contains only the dry-run objects.
- Row counts remain zero or test-only by explicit operator confirmation.
- The rollback draft targets only the expected dry-run tables in reverse order.
- Post-rollback verify confirms the target tables are removed and unrelated schemas are untouched.

Stop condition:

- If any non-draft or shared object appears in the target schema, do not run rollback draft until a human owner reviews it.

### 5.7 `Admate_AI_MMP` Readiness Decision

`Admate_AI_MMP` is viable only as a controlled fallback. It is not the preferred first execution environment because it introduces shared-project risk and higher operator approval burden.

Decision:

- Priority: fallback only.
- Current state: conditionally ready for read-only preflight planning, not ready for schema apply until owner confirmation and preflight pass.
- Next action before execution: obtain owner confirmation that it is non-critical and disposable, choose a clearly named dry-run schema, and run only preflight SQL in the next approved Gate.

## 6. Final Recommendation

Recommended order:

1. Local Supabase
2. `Admate_AI_MMP` disposable schema fallback

Local Supabase should be selected first after Supabase CLI and a compatible container runtime are available. It provides the lowest production risk, strongest rollback rehearsal, and cleanest separation from existing AdMate data.

If local tooling cannot be prepared in time, `Admate_AI_MMP` can be used only as a fallback after explicit owner confirmation and a preflight-only first step.

Rejected or held environments:

- Production AdMate Data Core direct apply: rejected.
- Production AdMate Data Core disposable schema: held for later only if all non-production options fail and a separate production readiness review approves it.

## 7. Stop Conditions

Stop before any SQL execution if:

- Supabase CLI or container runtime remains unavailable for local path.
- Target project might be production or production-adjacent.
- Operator cannot confirm the exact project and schema.
- Production env, service role credentials, provider tokens, or Meta tokens would be required.
- Preflight SQL has not run first in a shared-project fallback.
- Existing schema/table conflicts are found.
- `auth.users` reference strategy is unresolved.
- RLS or policy baseline cannot be verified.
- Rollback rehearsal cannot be performed safely.
- Any output would expose raw campaign-level rows, raw provider responses, tokens, session URLs, or secret-like values.

## 8. Next Gate Candidates

- `Foresight-Benchmark-16 selected environment preflight execution`
- `Foresight-Benchmark-17 nonprod schema dry-run execution`
- `Foresight-Benchmark-18 dry-run result review`

These next Gates should remain separated so preflight, schema apply, rollback rehearsal, and result review can each stop independently.
