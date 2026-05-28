# Foresight Simulator Range View-Model Extraction Result

Date: 2026-05-28

## Scope

- Extracted simulator range display math into `lib/foresightRangeViewModel.ts`.
- Kept `app/SimulatorPageClient.tsx` behavior mechanical: chart rows, comparison table rows, trend brief, and budget label formatting now come from the helper.
- Added focused Vitest coverage in `tests/benchmark/simulator-range-view-model.test.ts`.
- Added `check:simulator-range-view-model` for the focused helper contract.

## Guardrails

- No API routes, SQL, env, provider calls, Python, auth, debug/retrain/sync, production configs, or prediction-request tests were changed.
- Helper outputs are aggregate display view-models only.
- Tests assert helper output does not expose raw source rows, URLs, provider IDs, account/campaign/ad identifiers, tokens, cookies, sessions, or secrets.
- Forecast readiness remains separate from this helper; report/export/promotion/apply readiness stays blocked by the existing forecast confirmation contract.

## Validation

- Passed `npm run check:simulator-range-view-model` on 2026-05-28.
- Passed `npm run check:simulator-forecast-readiness-contract` on 2026-05-28.
- Passed `npm run check:predict-range-levels-contract` on 2026-05-28.
- Passed `npm run test:benchmark-ui` on 2026-05-28.
- Passed `npm run check:prediction-request-contract` on 2026-05-28.
- Passed `npx tsc --noEmit` on 2026-05-28.
- Passed `npm run lint` on 2026-05-28.
- Passed `npm run build` on 2026-05-28.
