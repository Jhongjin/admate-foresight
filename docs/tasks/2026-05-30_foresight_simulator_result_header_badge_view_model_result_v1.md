# Foresight Simulator Result Header Badge View Model Result v1

## Scope

- Added `lib/foresightSimulatorResultHeaderBadgeViewModel.ts` as a pure display-only builder for simulator result header readiness, evidence badge, and sample status output.
- Reused `buildForesightPredictionEvidenceViewModel` for score, basis, display, gate status, gate tone, and text tone derivation.
- Updated `lib/foresightSimulatorDecisionViewModel.ts` to call the new builder while preserving the existing public return shape.
- Added focused tests for pre-run, loading, calculated-without-result, strong market regression, fallback low-sample no-market, aggregate detail copy, and unsafe extra input fields.
- Added `check:simulator-result-header-badge-view-model` to `package.json`.

## Safety Boundary

- Offline view model extraction only.
- No provider live reads, database work, UI admin work, environment or secret inspection, production SQL, external network calls, persistence, export, report, or write behavior.
- No changes to `app/SimulatorPageClient.tsx`.
- No commit or push performed.

## Verification

- `npm run check:simulator-result-header-badge-view-model` passed: 1 file, 6 tests.
- `npm run check:simulator-decision-view-model` passed: 1 file, 4 tests.
- `npm run check:simulator-scenario-expansion-request-contract` passed: 1 file, 11 tests.
- `npm run check:protected-error-states` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `git diff --check` passed.
