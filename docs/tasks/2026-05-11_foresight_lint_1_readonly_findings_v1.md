# Foresight Lint 1 Read-only Findings v1

Date: 2026-05-11
Gate: Foresight-Lint-1
Status: blocked_by_lint_errors
Repo: admate-foresight

## Purpose

Record the current lint baseline before any cleanup implementation. This gate
is read-only and does not change application code, API behavior, benchmark
logic, database schema, environment variables, or production traffic.

## Commands Run

```text
npm run lint
npx tsc --noEmit
npm run benchmark:dry-run
```

## Result Summary

`npx tsc --noEmit` passed.

`npm run benchmark:dry-run` passed with side effects false:

- db_write=false
- meta_api_call=false
- llm_call=false
- python_retrain=false
- raw_file_created=false

`npm run lint` failed with 7 errors and 15 warnings.

## Lint Errors

| File | Issue |
| --- | --- |
| `app/competitor/CompetitorPageClient.tsx` | `react/no-unescaped-entities` on apostrophe text |
| `app/insights/InsightsPageClient.tsx` | `react-hooks/set-state-in-effect` for synchronous `setSeasonLoading(true)` inside an effect |
| `app/trends/TrendsPageClient.tsx` | `react-hooks/set-state-in-effect` for synchronous `setLoading(true)` inside an effect |
| `scripts/scrape_worker.js` | `@typescript-eslint/no-require-imports` for three CommonJS `require()` imports |

## Warning Families

Warnings include:

- unused values in simulator, insights, trends data, xlsx loader, and scrape worker files
- one unnecessary hook dependency in `app/SimulatorPageClient.tsx`
- one unused eslint-disable directive in `app/competitor/CompetitorPageClient.tsx`

## Recommended Cleanup Order

1. Fix the two low-risk text/eslint-disable issues in `CompetitorPageClient.tsx`.
2. Decide whether the React Compiler `set-state-in-effect` findings should be
   handled with async loading state transitions or targeted rule exceptions.
3. Handle `scripts/scrape_worker.js` separately because changing CommonJS worker
   imports may affect scraping runtime assumptions.
4. Only after errors are closed, decide whether to clean warnings in a separate
   low-risk pass.

## No-Touch Confirmation

This gate did not perform:

- code changes
- API changes
- SQL execution
- DB/schema/migration changes
- benchmark import or upload
- Meta API calls
- Python retrain
- external LLM calls
- production smoke calls
- secret, env, token, cookie, session, credential, raw provider response, or
  private URL output

## Next Gate

Suggested next gate:

```text
Foresight-Lint-2 minimal lint error cleanup plan
```
