# Foresight Simulator Predict Result Contract Result v1

## Scope

- Extracted simulator `/api/predict` result types and normalization helpers into `lib/foresightSimulatorPredictResultContract.ts`.
- Updated `app/SimulatorPageClient.tsx` to import the pure helper while preserving the current result/error display flow.
- Added focused Vitest coverage in `tests/benchmark/simulator-predict-result-contract.test.ts`.
- Added `check:simulator-predict-result-contract` to `package.json`.

## Behavior

- The helper rebuilds a display-only aggregate result from allowed fields instead of returning provider/raw response objects.
- Required result numbers must be finite non-negative numbers; malformed required values return `null`, preserving the existing prediction error fallback.
- Malformed optional aggregate fields are omitted so the existing UI can continue with safe defaults.
- Market averages require a complete aggregate shape; incomplete or malformed market averages are omitted.
- Raw rows, source records, provider/account/campaign/ad identifiers, URLs, tokens, cookies, sessions, credentials, and secrets are not copied into output.

## Verification

- Passed `npm run check:simulator-predict-result-contract` on 2026-05-30.
- Passed `npm run check:simulator-decision-view-model` on 2026-05-30.
- Passed `npm run check:simulator-kpi-benchmark-view-model` on 2026-05-30.
- Passed `npm run check:simulator-scenario-view-model` on 2026-05-30.
- Passed `npm run check:protected-error-states` on 2026-05-30.
- Passed `npx tsc --noEmit` on 2026-05-30.
- Passed `npm run lint` on 2026-05-30.
- Passed `git diff --check` on 2026-05-30; Git reported CRLF normalization warnings for existing tracked text files.

## Notes

- No provider live read, Supabase/Vercel/n8n operation, production SQL, external network call, env/secret output, commit, or push was performed.
