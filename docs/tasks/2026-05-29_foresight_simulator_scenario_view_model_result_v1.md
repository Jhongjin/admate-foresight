# Foresight Simulator Scenario View Model Result v1

## Scope

- Added `lib/foresightSimulatorScenarioViewModel.ts` for deterministic target-expansion display state.
- Updated `app/SimulatorPageClient.tsx` so the target-expansion scenario section renders from the new view model.
- Updated `lib/foresightSimulatorOptimizationViewModel.ts` to reuse the scenario helper instead of maintaining a duplicate row builder.
- Added `tests/benchmark/simulator-scenario-view-model.test.ts` and the package script `check:simulator-scenario-view-model`.

## Safety

- The view model emits aggregate display fields only: labels, formatted CPM/reach, status/tone, class names, and current-target summary.
- Raw rows, identifiers, URLs, provider/account/campaign/ad metadata, tokens, cookies, sessions, and secret fields are ignored.
- Scenario labels are bounded to known display labels, with unknown labels replaced by a generic safe label.

## Verification

- `npm run check:simulator-scenario-view-model`
- `npm run check:simulator-optimization-view-model`
- `npm run check:simulator-decision-view-model`
- `npm run test:benchmark-ui`
- `npm run check:api-response-safety-static`
- `npm run check:benchmark-kpi-static-contract`
- `npm run check:benchmark-source-static-contract`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `git diff --check`
