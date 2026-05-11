# Foresight Lint 2 Minimal Cleanup Plan v1

Date: 2026-05-11
Gate: Foresight-Lint-2
Status: planned
Repo: admate-foresight

## Purpose

Define a minimal, low-risk lint cleanup sequence after
`Foresight-Lint-1 Read-only Findings`.

This plan does not implement code changes. It keeps benchmark import/upload,
Meta API calls, Python retrain, database changes, and production traffic out of
scope.

## Current Blocking Errors

`npm run lint` currently fails on:

- `app/competitor/CompetitorPageClient.tsx`
- `app/insights/InsightsPageClient.tsx`
- `app/trends/TrendsPageClient.tsx`
- `scripts/scrape_worker.js`

## Recommended Minimal Patch Order

### 1. Competitor Text Cleanup

Scope:

- Escape or rewrite apostrophe text in `app/competitor/CompetitorPageClient.tsx`.
- Remove the now-unused eslint-disable directive if still unused.

Risk:

- Low. Text-only / comment-only UI cleanup.

Verification:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

### 2. React Loading Effects

Scope:

- Review `app/insights/InsightsPageClient.tsx` and `app/trends/TrendsPageClient.tsx`.
- Prefer moving loading initialization into the triggering event path or a
  narrowly justified local lint exception if the current effect is intentional
  and safer than restructuring.

Risk:

- Medium. Loading timing can affect UI state, so keep the diff small and verify
  both `/insights` and `/trends` local no-session/auth surfaces separately if a
  dev smoke is later approved.

Verification:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run benchmark:dry-run`

### 3. Scrape Worker Import Style

Scope:

- Decide whether `scripts/scrape_worker.js` should remain CommonJS with a file
  or override-level lint exception, or be converted to ESM.
- Do not change worker runtime style without checking local scrape assumptions.

Risk:

- Medium. Import style changes can affect worker startup.

Verification:

- `npm run lint`
- `node --check scripts/scrape_worker.js`
- Any existing local script smoke that does not call external providers

### 4. Warning Cleanup

Scope:

- Remove clearly unused variables only after lint errors are closed.
- Keep broader component refactors out of the first cleanup commit.

Risk:

- Low to medium depending on file.

## No-Touch Confirmation

This planning gate does not perform:

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
Foresight-Lint-3 minimal lint cleanup implementation
```

Implementation should be allowed to touch only the files needed for lint errors
and should stop before any provider call, database change, or production smoke.
