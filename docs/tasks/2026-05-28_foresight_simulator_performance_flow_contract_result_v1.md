# Foresight Simulator Performance Flow Contract Result v1

Date: 2026-05-28 KST
Gate: Foresight-Simulator-Performance-Flow-Contract
Status: implemented
Repo: admate-foresight

## Scope

Added deterministic contract coverage for the simulator performance flow:

- Campaign budget conversion to the shared monthly prediction basis.
- Predict-range level inclusion of the current monthly budget.
- Forecast range confirmation readiness from synthetic aggregate monthly points.
- Simulator range view-model conversion back to campaign-period rows.
- Operator review readiness blocked unless data is sufficient and current budget is present.
- Report, export, promotion, and apply readiness kept false with zero side effects.

## Changes

- Added `tests/benchmark/simulator-performance-flow-contract.test.ts`.
- Added `check:simulator-performance-flow-contract` to `package.json`.

## Guardrails

This gate is contract-only and did not change API routes, UI components, auth gates,
environment files, SQL, provider code, report/export/promotion/apply paths, or
production side-effect paths.

The serialized contract output is aggregate-only. It permits existing false
sentinel flags such as `sourceRowsIncluded` and `rawRecordsIncluded`, and checks
that raw/source/account/campaign/ad/provider/url/token/cookie/session/secret-like
data is not exposed.

## Validation

Run locally and passed:

```text
npm run check:simulator-performance-flow-contract
npm run check:simulator-range-view-model
npm run check:forecast-range-confirmation-contract
npm run check:prediction-request-contract
npm run test:benchmark-ui
npx tsc --noEmit
npm run lint
npm run build
```
