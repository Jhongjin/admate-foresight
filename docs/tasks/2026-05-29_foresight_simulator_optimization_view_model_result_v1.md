# Foresight Simulator Optimization Guide View-Model Result v1

## Scope

- Extracted the simulator campaign optimization guide decision and copy logic into `lib/foresightSimulatorOptimizationViewModel.ts`.
- Updated `app/SimulatorPageClient.tsx` to render the optimization guide from the deterministic view model.
- Added focused Vitest contracts in `tests/benchmark/simulator-optimization-view-model.test.ts`.
- Added `check:simulator-optimization-view-model` to `package.json`.

## Behavior

- Positive budget-increase and target-expansion guidance is shown only when performance evidence is ready for review.
- Low-readiness or evidence-limited results keep the guide bounded with Korean operator service copy such as evidence confirmation and reach-possibility language.
- Missing results or neutral performance evidence do not invent optimization guidance.
- View-model output stays aggregate/display-only and avoids raw source rows, provider/account/campaign/ad identifiers, URLs, tokens, cookies, sessions, or secrets.

## Verification

- Passed `npm run check:simulator-optimization-view-model` on 2026-05-29.
- Passed `npm run check:simulator-decision-view-model` on 2026-05-29.
- Passed `npm run check:simulator-prediction-evidence-view-model` on 2026-05-29.
- Passed `npm run check:simulator-range-view-model` on 2026-05-29.
- Passed `npm run check:simulator-performance-flow-contract` on 2026-05-29.
- Passed `npm run check:simulator-forecast-readiness-contract` on 2026-05-29.
- Passed `npx tsc --noEmit` on 2026-05-29.
- Passed `npm run lint` on 2026-05-29.
- Passed `git diff --check` on 2026-05-29.

## Notes

- No production SQL, provider calls, Vercel/n8n UI, env/secrets, live smoke, commit, or push were performed.
