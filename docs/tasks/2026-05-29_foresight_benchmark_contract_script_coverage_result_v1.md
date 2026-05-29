# Foresight Benchmark Contract Script Coverage Result v1

Date: 2026-05-30 KST
Gate: Foresight-Benchmark-Contract-Script-Coverage
Status: implemented
Repo: admate-foresight

## Scope

Added first-class package scripts for existing benchmark contract, route/source,
UI fixture, and simulator tests that were only reachable through direct Vitest
paths or the aggregate benchmark UI suite.

No app, library, environment, provider, database, or production configuration
files were changed.

## Added Scripts

- `check:benchmark-route-output-guards`
- `check:benchmark-source-metadata-contract`
- `check:benchmark-ui-runner-smoke`
- `check:benchmark-ui-state-fixtures`
- `check:benchmark-ui-state-rendering`
- `check:external-lookup-fail-closed-contract`
- `check:prediction-data-sufficiency-contract`
- `check:prediction-route-objectives-contract`
- `check:regression-objectives-contract`
- `check:simulator-budget-basis`
- `check:simulator-range-normalization`

## Verification

Run locally and passed:

```text
npm run check:benchmark-route-output-guards
npm run check:benchmark-source-metadata-contract
npm run check:benchmark-ui-runner-smoke
npm run check:benchmark-ui-state-fixtures
npm run check:benchmark-ui-state-rendering
npm run check:external-lookup-fail-closed-contract
npm run check:prediction-data-sufficiency-contract
npm run check:prediction-route-objectives-contract
npm run check:regression-objectives-contract
npm run check:simulator-budget-basis
npm run check:simulator-range-normalization
npm run test:benchmark-ui
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```
