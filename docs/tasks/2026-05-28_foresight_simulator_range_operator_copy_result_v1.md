# Foresight Simulator Range Operator Copy Result

Date: 2026-05-28

## Scope

- Added `buildSimulatorRangeReviewCopy` in `lib/foresightRangeViewModel.ts`.
- Moved simulator forecast-range operator review label, detail, and tone copy out of `app/SimulatorPageClient.tsx`.
- Added deterministic `nextAction` copy for the simulator operator review view-model.
- Extended `tests/benchmark/simulator-range-view-model.test.ts` for all four confirmation states plus loading, pre-run, and no-confirmation fallbacks.

## Guardrails

- Helper is aggregate-only and inert: no API calls, database/provider/LLM paths, reports, exports, promotion/apply actions, secrets, env, or auth changes.
- Operator copy uses service review language only: 검토 가능, 근거 보강 필요, 현재 예산 확인 필요, 구간 재계산 필요.
- Copy does not claim certainty, confidence, or statistical intervals.
- Serialization coverage asserts helper output does not expose raw/source/account/campaign/ad/provider/url/token/cookie/session/secret-like data.

## Validation

- Passed `npm run check:simulator-range-view-model` on 2026-05-28.
- Passed `npm run check:forecast-range-confirmation-contract` on rerun on 2026-05-28.
- Passed `npm run check:simulator-performance-flow-contract` on 2026-05-28.
- Passed `npm run test:benchmark-ui` on 2026-05-28.
- Passed `npx tsc --noEmit` on 2026-05-28.
- Passed `npm run lint` on 2026-05-28.
- Passed `npm run build` on 2026-05-28.
