# Foresight Prelaunch Offline Contract Aggregate Result v1

Date: 2026-06-06 KST
Gate: Foresight-Prelaunch-Offline-Contract-Aggregate
Status: implemented
Repo: admate-foresight

## Scope

- Added `scripts/check-foresight-prelaunch-offline-contracts.mjs` as a local/offline aggregate runner for the approved Foresight prelaunch contract subset.
- Added `check:foresight-prelaunch-offline-contracts` to run the aggregate directly.
- Added `verify:prelaunch-local` as the local prelaunch alias for the aggregate.
- Kept the approved subset small and limited to existing static/local contract checks.

## Included Offline Contracts

- `check:api-response-safety-static`
- `check:auth-handoff-static`
- `check:benchmark-kpi-static-contract`
- `check:benchmark-source-static-contract`
- `check:sentinel-prediction-evidence-manifest`
- `check:prediction-request-contract`

## Safety Boundary

- Aggregate script validates package wiring before executing component checks.
- Aggregate script contains explicit included-contract and excluded-capability arrays.
- Excluded capabilities are provider calls, SQL/storage mutation, env/secret work, live ingest, authenticated UI smoke, upload, publish, persist, promote, apply, and campaign mutation.
- Aggregate script does not read environment values, call external services, upload/publish/persist/promote/apply changes, or mutate campaigns.
- Component commands run serially with clear progress output and fail fast with a nonzero exit on failure.

## Verification

Run locally and passed:

```text
npm run check:foresight-prelaunch-offline-contracts
npm run verify:prelaunch-local
npm run lint
npm run build
git diff --check
```

The direct aggregate and `verify:prelaunch-local` each exercised the six included component commands successfully.

## Notes

- No live action was performed.
- No commit or push was performed.
