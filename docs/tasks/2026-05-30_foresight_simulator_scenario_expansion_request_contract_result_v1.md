# Foresight Simulator Scenario Expansion Request Contract v1

## Scope
- Extracted the simulator target expansion request assembly from `app/SimulatorPageClient.tsx`.
- Added `buildForesightSimulatorScenarioExpansionRequests` in `lib/foresightSimulatorScenarioExpansionRequestContract.ts`.
- Added focused benchmark coverage and the package check script.

## Behavior
- Gender selections create a `성별 전체 확장` request with `genders: []`.
- Age selections create a `연령 전체 확장` request with `ageRanges: []`.
- Industry-only selections create no expansion request.
- Request bodies are limited to `industries`, `genders`, `ageRanges`, `objectives`, and `budget`.
- Input arrays are copied before being placed in request bodies.
- Invalid or negative `monthlyBudget` values fail closed with no requests.
- Secret-like or identifier-like strings are omitted from display descriptions and copied request body arrays, while regular filter values are preserved.

## Verification
- `npm run check:simulator-scenario-expansion-request-contract` passed.
- `npm run check:simulator-scenario-view-model` passed.
- `npm run check:simulator-predict-result-contract` passed.
- `npm run check:protected-error-states` passed.
- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `git diff --check` passed with only existing line-ending conversion warnings for touched files.

## Notes
- `/api/predict` calls remain in `app/SimulatorPageClient.tsx`; only the expansion request contract is extracted.
- No commit or push was performed.
