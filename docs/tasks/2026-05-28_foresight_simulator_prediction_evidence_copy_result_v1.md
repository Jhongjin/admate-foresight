# Foresight Simulator Prediction Evidence Copy Result v1

## Scope

- Extracted the Simulator prediction evidence score/display/status logic into `lib/foresightPredictionEvidenceViewModel.ts`.
- Kept the existing numeric score formula stable for regression results so range spread math continues to receive the same score values.
- Updated `app/SimulatorPageClient.tsx` to consume the helper while keeping the existing layout and internal confidence variable names where broad rename churn would add risk.
- Added `benchmarkEvidenceLabel` to `components/KPICard.tsx`; it renders evidence copy when present and falls back to `benchmarkConfidenceLabel` for existing tests and fixtures.
- Added focused benchmark tests for strong/weak evidence, loading and uncalculated states, no-market score behavior, non-regression states, and forbidden confidence/certainty/promise wording in helper operator copy.

## Safety Boundary

- Offline-only view model extraction and UI copy wiring.
- No production SQL, provider calls, deploy, live smoke, credential reads, or secret printing.
- No commit or push performed.

## Verification

- `npm run check:simulator-prediction-evidence-view-model`
- `npm run check:simulator-range-view-model`
- `npm run check:simulator-forecast-readiness-contract`
- `npm run check:prediction-request-contract`
- `npm run test:benchmark-ui`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`
