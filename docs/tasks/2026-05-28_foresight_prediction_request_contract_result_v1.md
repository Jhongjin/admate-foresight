# Foresight Prediction Request Contract Result v1

Date: 2026-05-28 KST
Gate: Foresight-Prediction-Request-Contract
Status: implemented
Repo: admate-foresight

## Scope

Added local deterministic contract coverage for the shared prediction request
normalizer used by `POST /api/predict` and `POST /api/predict-range`.

This gate verifies request shape, budget, month, and generic validation error
behavior without changing prediction logic or route behavior.

## Changes

- Added focused Vitest coverage for `normalizePredictionRequest`.
- Added a package script for the prediction request contract check.
- Preserved reversed month ranges as normalized input because data sufficiency
  handles that case downstream.

## No-Touch Confirmation

This gate did not change:

- API routes
- database schema, migrations, SQL, or Supabase policies
- authentication or session handling
- debug, retrain, sync, Meta, Google, Python, LLM, export, or provider paths
- UI components or production configuration
- environment, secret, token, cookie, credential, or browser storage handling

## Verification

Run locally and passed:

```text
npm run check:prediction-request-contract
npx vitest run tests/benchmark/prediction-route-objectives-contract.test.ts tests/benchmark/regression-objectives-contract.test.ts tests/benchmark/prediction-data-sufficiency-contract.test.ts
npm run check:api-response-safety-static
npm run check:benchmark-kpi-static-contract
npm run check:forecast-range-confirmation-contract
npm run test:benchmark-ui
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

## Residual Risk

This is contract-only local coverage. It does not prove authenticated
production behavior, live benchmark quality, database data freshness, or visual
state.
