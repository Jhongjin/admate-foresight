# Foresight Simulator Product-Safe Error View-Model Result v1

## Scope

- Added `lib/foresightSimulatorProductSafeErrorViewModel.ts` for the simulator product-safe error catalog and `buildSimulatorErrorPanel` helper.
- Updated `app/SimulatorPageClient.tsx` to import and use the extracted helper while keeping the existing Korean operator copy and visible UI behavior.
- Added focused Vitest coverage in `tests/benchmark/simulator-product-safe-error-view-model.test.ts`.
- Updated `tests/benchmark/simulator-product-safe-error-states.test.ts` to assert the page uses the extracted helper.
- Updated `scripts/check-protected-error-states.mjs` so the protected simulator error-state guard follows the new helper boundary.
- Added `check:simulator-product-safe-error-view-model` to `package.json`.

## Safety

- The helper output is limited to `title`, `description`, `ledger` display items, and `nextActions`.
- Ledger display items contain only `label`, `value`, `detail`, and `tone`.
- Detail copy is allow-listed for the current simulator states. Unknown, object, oversized, or unsafe detail input falls back to bounded Korean section copy.
- Tests cover all current error keys: `filters`, `prediction`, `range`, `scenario`, and `mlBaseline`.
- Tests assert no raw rows, source fields, IDs, URLs, provider/account/campaign/ad metadata, tokens, cookies, sessions, or secrets leak through output.

## Verification

- Passed `npm run check:simulator-product-safe-error-view-model`.
- Passed `npx vitest run tests/benchmark/simulator-product-safe-error-states.test.ts`.
- Passed `npm run check:simulator-scenario-view-model`.
- Passed `npm run check:protected-error-states`.
- Passed `npm run check:api-response-safety-static`.
- Passed `npm run check:benchmark-kpi-static-contract`.
- Passed `npm run check:benchmark-source-static-contract`.
- Passed `npm run test:benchmark-ui`.
- Passed `npx tsc --noEmit`.
- Passed `npm run lint`.
- Passed `npm run build`.
- Passed `git diff --check`; Git emitted line-ending normalization warnings only.

## Notes

- No production smoke, env/secrets, `.vercel`, Supabase/Vercel/n8n UI, provider live reads, external mutations, production SQL, commit, push, or staging were performed.
