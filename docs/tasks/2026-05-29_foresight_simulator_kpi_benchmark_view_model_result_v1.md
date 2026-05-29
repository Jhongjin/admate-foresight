# Foresight Simulator KPI Benchmark Card View-Model Result v1

## Scope

- Extracted simulator KPI benchmark card label, value, delta, basis, and blocked-output assembly into `lib/foresightSimulatorKpiBenchmarkViewModel.ts`.
- Updated `app/SimulatorPageClient.tsx` to render KPI cards from the deterministic view model.
- Added focused Vitest coverage in `tests/benchmark/simulator-kpi-benchmark-view-model.test.ts`.
- Added `check:simulator-kpi-benchmark-view-model` to `package.json`.
- Updated `scripts/check-benchmark-kpi-static-contract.mjs` to recognize and protect the new view-model boundary.

## Behavior

- KPI cards preserve the existing six-card order and market comparison math.
- Pre-result KPI cards stay inert with `시뮬레이션 후 기준 확인` and no invented metric values.
- Strong market matches show 업종 매칭 벤치마크 labels, formatted values, deltas, and aggregate basis lines.
- No-market results fall back to 전체 기준 벤치마크 with the blocked output `업종 특화 평균처럼 표시하지 않음`.
- View-model output remains aggregate/display-only and does not expose raw rows, provider/account/campaign/ad identifiers, URLs, tokens, cookies, sessions, or secrets.

## Verification

- Passed `npm run check:simulator-kpi-benchmark-view-model` on 2026-05-29.
- Passed `npm run check:benchmark-kpi-static-contract` on 2026-05-29.
- Passed `npm run check:simulator-decision-view-model` on 2026-05-29.
- Passed `npm run check:simulator-optimization-view-model` on 2026-05-29.
- Passed `npm run check:simulator-prediction-evidence-view-model` on 2026-05-29.
- Passed `npm run check:simulator-range-view-model` on 2026-05-29.
- Passed `npm run check:simulator-performance-flow-contract` on 2026-05-29.
- Passed `npm run check:simulator-forecast-readiness-contract` on 2026-05-29.
- Passed `npx tsc --noEmit` on 2026-05-29.
- Passed `npm run lint` on 2026-05-29.
- Passed `git diff --check` on 2026-05-29.

## Notes

- No production SQL, provider calls, Vercel/n8n UI, env/secrets, live smoke, commit, or push were performed.
