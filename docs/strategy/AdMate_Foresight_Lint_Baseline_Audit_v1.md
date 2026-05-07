# AdMate Foresight Lint Baseline Audit v1

작성일: 2026-05-07

문서 상태: Gate Foresight-Lint-1 existing lint baseline audit

대상 repo: `D:\Projects\AdMate\admate-foresight`

## 1. Purpose

이 문서는 현재 `npm run lint`가 실패하는 기존 lint baseline을 read-only로 정리한다. 목적은 다음 hardening 구현 전에 어떤 lint 문제가 기존 코드 문제인지, 어떤 항목을 먼저 정리해야 하는지 분리하는 것이다.

이번 Gate는 문서화만 수행한다. 코드 수정, lint 자동 수정, DB/API/env 변경, Meta API 호출, Python retrain 실행, raw data/model artifact 추가는 하지 않는다.

## 2. Command Result

실행 명령:

```powershell
npm run lint
```

결과:

```text
Failed
22 problems
7 errors
15 warnings
0 errors and 1 warning potentially fixable with --fix
```

Lint failure files:

| File | Errors | Warnings | Notes |
| --- | ---: | ---: | --- |
| `app/competitor/page.tsx` | 2 | 1 | JSX escaped entity and unused disable comment |
| `app/insights/page.tsx` | 1 | 7 | React set-state-in-effect plus unused code |
| `app/page.tsx` | 0 | 2 | unused helper and hook dependency warning |
| `app/trends/page.tsx` | 1 | 0 | React set-state-in-effect |
| `lib/trendsData.ts` | 0 | 1 | unused aggregate variable |
| `lib/xlsxLoader.ts` | 0 | 3 | unused imports/helper |
| `scripts/scrape_worker.js` | 3 | 1 | CommonJS require imports and unused catch parameter |

## 3. Baseline Relationship to Security-3/4

Recent security Gates did not touch the lint failure files.

Recent commits checked:

| Commit | Scope | Files |
| --- | --- | --- |
| `39acd10` `security: disable Foresight export and debug routes` | Security-3 implementation | `app/api/debug-data/route.ts`, `app/api/debug-env/route.ts`, `app/api/export/route.ts` |
| `bf65e8d` `docs: plan Foresight meta sync and retrain guards` | Security-4 documentation | `docs/strategy/AdMate_Foresight_MetaSync_Retrain_Guard_Audit_Plan_v1.md` |

Affected lint files last changed before Security-3/4:

| File | Last observed change | Baseline decision |
| --- | --- | --- |
| `app/competitor/page.tsx` | `4984755` on 2026-04-27 | Existing baseline |
| `app/insights/page.tsx` | `f11f1cb` on 2026-04-09 | Existing baseline |
| `app/page.tsx` | `04c9e3c` on 2026-04-27 | Existing baseline |
| `app/trends/page.tsx` | `f11f1cb` on 2026-04-09 | Existing baseline |
| `lib/trendsData.ts` | `ea1c200` on 2026-04-10 | Existing baseline |
| `lib/xlsxLoader.ts` | `d71b24d` on 2026-04-27 | Existing baseline |
| `scripts/scrape_worker.js` | `4984755` on 2026-04-27 | Existing baseline |

Conclusion:

```text
Current lint failure is unrelated to Security-3 route changes and Security-4 documentation.
It is a pre-existing lint baseline that prevents npm run lint from serving as a clean hardening gate.
```

## 4. Severity Model

Severity definitions for this audit:

| Severity | Meaning |
| --- | --- |
| P0 | Build/runtime blocker or security-critical lint issue |
| P1 | Prevents lint from being a trustworthy hardening verification gate |
| P2 | Style, cleanup, or non-blocking maintainability warning |

This audit found no P0 from lint output alone. The 7 lint errors are P1 because they make `npm run lint` fail and reduce verification signal for future hardening patches. Warnings are P2 unless they point to code that should be removed before broader refactor.

## 5. File-by-file Findings

### 5.1 `app/competitor/page.tsx`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 123 | unused eslint-disable directive | warning | P2 | Existing `react-hooks/exhaustive-deps` disable is no longer needed. |
| 256 | `react/no-unescaped-entities` | error | P1 | JSX text contains single quotes around `searchLabel`. |
| 256 | `react/no-unescaped-entities` | error | P1 | Same JSX text contains the closing single quote. |

Current code shape:

```text
useEffect on page entry includes an unused eslint-disable comment.
Empty-result message renders '{searchLabel}' directly in JSX text.
```

Cleanup candidate:

- remove unused eslint-disable comment if dependency behavior is confirmed
- escape the single quotes or use a JSX-safe text expression

Risk:

- low UI copy risk for escaped entity fix
- low to medium hook risk if dependency comment removal changes lint expectations after future edits

### 5.2 `app/insights/page.tsx`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 6 | `@typescript-eslint/no-unused-vars` | warning | P2 | `LineChart` imported but unused. |
| 6 | `@typescript-eslint/no-unused-vars` | warning | P2 | `Line` imported but unused. |
| 49 | `@typescript-eslint/no-unused-vars` | warning | P2 | `getColor` helper unused. |
| 54 | `@typescript-eslint/no-unused-vars` | warning | P2 | `isGood` variable assigned but unused. |
| 211 | `react-hooks/set-state-in-effect` | error | P1 | `setSeasonLoading(true)` called synchronously inside effect. |
| 230 | `@typescript-eslint/no-unused-vars` | warning | P2 | `spendByMonth` assigned but unused. |
| 239 | `@typescript-eslint/no-unused-vars` | warning | P2 | `cpmByMonth` assigned but unused. |
| 248 | `@typescript-eslint/no-unused-vars` | warning | P2 | `summaryCards` assigned but unused. |

Current code shape:

```text
Seasonality fetch effect sets loading synchronously, then fetches /api/seasonality.
Several chart/data helpers appear to be remnants of an earlier insights UI.
```

Cleanup candidate:

- refactor loading state pattern to satisfy `react-hooks/set-state-in-effect`
- remove unused chart imports/helpers/data transforms after confirming no planned UI section uses them

Risk:

- medium UI behavior risk for loading-state refactor
- low cleanup risk for clearly unused imports/variables

### 5.3 `app/page.tsx`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 114 | `@typescript-eslint/no-unused-vars` | warning | P2 | `formatBudgetFull` helper unused. |
| 437 | `react-hooks/exhaustive-deps` | warning | P2 | `ageRanges` is listed as an unnecessary dependency in `useCallback`. |

Current code shape:

```text
Main planner page has cleanup warnings but no lint errors.
```

Cleanup candidate:

- remove unused helper if no UI path needs it
- remove unnecessary hook dependency after confirming callback logic

Risk:

- low if limited to unused helper/dependency cleanup

### 5.4 `app/trends/page.tsx`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 149 | `react-hooks/set-state-in-effect` | error | P1 | `setLoading(true)` called synchronously inside effect before fetching trends. |

Current code shape:

```text
Monthly trends effect toggles loading synchronously, then fetches /api/trends.
```

Cleanup candidate:

- refactor loading state pattern to satisfy React Compiler lint rule
- preserve existing fetch timing and loading UX

Risk:

- medium UI behavior risk because the trends loading indicator and fetch sequence can regress if refactored carelessly

### 5.5 `lib/trendsData.ts`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 46 | `@typescript-eslint/no-unused-vars` | warning | P2 | `totalSpend` aggregate assigned but unused. |

Cleanup candidate:

- remove unused aggregate if not needed
- or use it intentionally in returned trend metrics if product requires spend trend

Risk:

- low if removal only
- medium if deciding to expose/use spend in trend output

### 5.6 `lib/xlsxLoader.ts`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 1 | `@typescript-eslint/no-unused-vars` | warning | P2 | `path` import unused. |
| 2 | `@typescript-eslint/no-unused-vars` | warning | P2 | `XLSX` import unused. |
| 25 | `@typescript-eslint/no-unused-vars` | warning | P2 | `parseActionMap` helper unused. |

Current code shape:

```text
The loader now primarily uses Supabase RPC aggregate loading.
Legacy XLSX import/helper code appears partly unused.
```

Cleanup candidate:

- remove unused imports/helper only if no local XLSX fallback is intentionally being preserved
- keep this separate from benchmark upload parser implementation

Risk:

- low if confirmed dead code
- medium if future local loader fallback still depends on these symbols conceptually

### 5.7 `scripts/scrape_worker.js`

Findings:

| Line | Rule | Lint level | Audit severity | Description |
| ---: | --- | --- | --- | --- |
| 7 | `@typescript-eslint/no-require-imports` | error | P1 | CommonJS `require('playwright')` in standalone Node worker. |
| 8 | `@typescript-eslint/no-require-imports` | error | P1 | CommonJS `require('path')` in standalone Node worker. |
| 9 | `@typescript-eslint/no-require-imports` | error | P1 | CommonJS `require('fs')` in standalone Node worker. |
| 147 | `@typescript-eslint/no-unused-vars` | warning | P2 | catch parameter `_` unused. |

Current code shape:

```text
Standalone Node.js worker uses CommonJS intentionally for direct node execution.
Repo ESLint currently applies TypeScript import rules to this script.
```

Cleanup candidate options:

1. Convert worker to ESM and verify route caller compatibility.
2. Add a scoped ESLint override for standalone scripts.
3. Rename or place worker under a scripts-specific lint policy.

Risk:

- medium if converting module format because `meta-ads-scrape` runtime relies on this worker
- low to medium if using a scoped lint override, but policy should be explicit

## 6. Must-fix Before Next Code Hardening

If future hardening Gates require `npm run lint` as a blocking verification, these P1 lint errors should be fixed first or the Gate should explicitly use scoped verification.

Must-fix for clean lint gate:

| File | Required action |
| --- | --- |
| `app/competitor/page.tsx` | resolve two `react/no-unescaped-entities` errors |
| `app/insights/page.tsx` | resolve `react-hooks/set-state-in-effect` error |
| `app/trends/page.tsx` | resolve `react-hooks/set-state-in-effect` error |
| `scripts/scrape_worker.js` | resolve or scope three `no-require-imports` errors |

Can be deferred:

| File | Deferred items |
| --- | --- |
| `app/competitor/page.tsx` | unused eslint-disable warning |
| `app/insights/page.tsx` | unused imports/helpers/data transforms |
| `app/page.tsx` | unused helper and hook dependency warning |
| `lib/trendsData.ts` | unused `totalSpend` warning |
| `lib/xlsxLoader.ts` | unused import/helper warnings |
| `scripts/scrape_worker.js` | unused catch parameter warning |

Recommended policy for the next code hardening Gate:

```text
Do not let unrelated baseline lint failures obscure security route verification.
Either clean P1 lint errors first, or use scoped lint/type/build/smoke checks and report baseline lint separately.
```

## 7. Cleanup Plan Candidate

### 7.1 Phase 1: Lint P1 Errors

Candidate files:

- `app/competitor/page.tsx`
- `app/insights/page.tsx`
- `app/trends/page.tsx`
- `scripts/scrape_worker.js`

Expected risk:

| File | Risk | Notes |
| --- | --- | --- |
| `app/competitor/page.tsx` | Low | UI copy escape only, plus optional unused disable cleanup |
| `app/insights/page.tsx` | Medium | React effect loading state refactor needs visual/API smoke |
| `app/trends/page.tsx` | Medium | React effect loading state refactor needs visual/API smoke |
| `scripts/scrape_worker.js` | Medium | Worker module format or lint override can affect scrape fallback |

Verification candidate:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- no-auth smoke for security routes if touched by concurrent hardening
- manual or browser smoke for `/insights`, `/trends`, and `/competitor` if UI logic changes

### 7.2 Phase 2: P2 Warning Cleanup

Candidate files:

- `app/page.tsx`
- `lib/trendsData.ts`
- `lib/xlsxLoader.ts`
- remaining warning lines in `app/competitor/page.tsx`, `app/insights/page.tsx`, `scripts/scrape_worker.js`

Expected risk:

- low for unused imports/variables
- medium for `lib/xlsxLoader.ts` if legacy XLSX fallback intent is unclear

### 7.3 Phase 3: Lint Policy Clarification

If standalone scripts should remain CommonJS:

- document script lint policy
- add scoped ESLint override only after approval
- avoid broad disabling of lint rules across app code

## 8. Open Questions

1. Should standalone Node scripts be linted under the same TypeScript/Next rules as app code?
2. Should `scripts/scrape_worker.js` remain CommonJS for runtime compatibility?
3. Are unused `lib/xlsxLoader.ts` XLSX symbols intentionally preserved for a future local loader, or can they be removed?
4. Should lint cleanup be completed before `Foresight-Security-5`, or should Security-5 use scoped checks and record lint baseline?
5. Should React Compiler lint errors be treated as hard blockers for all frontend Gates?

## 9. Follow-up Gate Proposal

### Foresight-Lint-2: Existing P1 Lint Cleanup

Scope candidate:

- fix P1 lint errors only
- avoid behavior changes beyond necessary React lint refactors
- preserve scrape worker runtime behavior
- no DB/API/env changes
- no Meta API call
- no Python retrain

### Foresight-Security-5: Meta-sync/Py-retrain Dry-run Guard Implementation

Scope candidate:

- use scoped verification if lint baseline is not cleaned first
- keep no DB write, no Meta API call, no Python retrain
- do not mix broad lint cleanup with route hardening changes

## 10. Final Recommendation

Lint baseline should be treated as an existing verification blocker, not a Security-3/4 regression.

Recommended next step:

```text
1. Fix P1 lint errors in a dedicated Lint-2 Gate.
2. Defer P2 warnings unless touching those files anyway.
3. Keep Security-5 route hardening separate from UI/script lint cleanup.
4. If Security-5 goes first, use scoped checks and explicitly report the baseline lint failure.
```
