# Foresight Simulator ML Baseline View-Model Result v1

## Scope

- Added `lib/foresightSimulatorMlBaselineViewModel.ts` for unknown-safe `/api/py-predict` response normalization and deterministic 보조 기준선 panel output.
- Updated `app/SimulatorPageClient.tsx` to store normalized ML baseline results and render badge, summary, metric cards, R2 evidence, loading, and error decisions from the view model.
- Added focused Vitest coverage in `tests/benchmark/simulator-ml-baseline-view-model.test.ts`.
- Added `check:simulator-ml-baseline-view-model` to `package.json`.

## Behavior

- `random_forest` results render as `보수 기준선`; `linear_regression` results render as `추세 기준선`.
- Unknown model types render bounded copy as `모델 확인 필요` instead of silently becoming a trend baseline.
- Partial or malformed numeric fields render safe placeholders and never call number formatters on invalid values.
- Fully malformed responses are rejected and routed to the existing product-safe 보조 기준선 error state.
- View-model output remains aggregate/display-only and avoids raw rows, provider/account/campaign/ad identifiers, URLs, tokens, cookies, sessions, or secrets.

## Verification

- Passed `npm run check:simulator-ml-baseline-view-model` on 2026-05-29.
- Passed `npx vitest run tests/benchmark/simulator-product-safe-error-states.test.ts` on 2026-05-29.
- Passed `npx tsc --noEmit` on 2026-05-29.
- Passed `git diff --check` on 2026-05-29.

## Notes

- No production SQL, provider calls, Vercel/n8n UI, env/secrets, live smoke, commit, or push were performed.
