# Foresight Live Demo Runbook

Updated: 2026-06-27

Purpose: let a user test the deployed Foresight screen after login, using safe demo/anonymized inputs. This is not a local setup guide and does not require code, deployment, environment variable, database, or production flag changes.

## 1. Start Point

| Item | Value |
|---|---|
| Product | AdMate Foresight |
| Main route | `/` |
| Main screen | Home simulator / performance forecast |
| Production URL candidate | `https://foresight.admate.ai.kr/` |
| Actual production or preview URL | Commander 확인 필요 |
| Login | Required if redirected to `/login?next=%2F` |
| Account | Foresight-enabled demo/anonymized account |
| Main screenshot target | `예측 결과` KPI card and `이번 예측의 기준 확인` panel |

Optional appendix routes:

| Route | Use |
|---|---|
| `/trends` | Industry trend benchmark appendix |
| `/insights` | Seasonality/pressure review appendix |
| `/account` | Access state troubleshooting only |

## 2. Safe Demo Inputs

Use the fixture file:

`outputs/admate-presentation-v2/test-fixtures/foresight-demo-scenarios.json`

Recommended main scenario:

| Field | Input |
|---|---|
| 총 캠페인 예산 | Demo budget bucket only. Do not say or type a real advertiser budget. |
| 캠페인 기간 | `1개월` |
| 성수기/시즌 할증 적용 | Off by default |
| 타겟 업종 | A safe demo/general industry option visible in the UI |
| 캠페인 목표 | `트래픽` or another broad objective visible in the UI |
| 노출 위치 | `전체 위치` |
| 소재 형태 | `전체 소재` |
| 타겟팅 - 성별 | `전체` |
| 타겟팅 - 연령 | Broad/all available |

If an exact dropdown option is not visible in the deployed UI, leave the UI default and record `확인 필요` rather than inventing a value.

Budget handling:

- Prefer keeping the deployed UI default value.
- If the demo requires changing the budget field, use only a Commander-approved demo bucket value.
- Do not type or describe a real advertiser budget, spend, contract rate, or performance number.

## 3. Button-by-button Flow

1. Open the confirmed Foresight production or preview URL.
2. If redirected, sign in with a Foresight-enabled demo/anonymized account.
3. Confirm the `/` screen shows `AdMate Foresight 성과 예측`.
4. In `조건 설정`, review:
   - `총 캠페인 예산`
   - `캠페인 기간`
   - `성수기/시즌 할증 적용`
   - `타겟 업종`
   - `캠페인 목표`
   - `노출 위치`
   - `소재 형태`
   - `타겟팅`
5. Apply the safe demo inputs or keep the default UI values.
6. In the right-side `다음 확인` panel, click `시뮬레이션 시작`.
7. Wait until the button no longer says `예측 계산 중`.
8. Confirm the result section `예측 결과` appears.
9. Check at least one KPI card, preferably `예상 도달` or `예상 CPM`.
10. Check the panel titled `이번 예측의 기준 확인`.
11. In that panel, verify these cells are present when a result is available:
    - `기간 예산`
    - `예측 방식`
    - `데이터 근거`
    - `구간 상태`
12. Check `예상 범위`.
13. Check `데이터 충분성 판정`.
14. Scroll to `예산별 도달 곡선` if available.
15. Confirm `내보내기 준비 중` is disabled or clearly gated.
16. If running a second pass, use `다시 시뮬레이션` only after confirming no real advertiser or campaign data is visible.

## 4. Expected Results

The demo is successful when the screen behaves like this:

| Area | Expected result |
|---|---|
| Login | User reaches `/` with a demo/anonymized account |
| Home simulator | `조건 설정`, `집행 요약`, `기준선 근거`, and `다음 확인` are visible |
| Simulation button | `시뮬레이션 시작` changes through loading and returns with result content |
| KPI | `예측 결과` shows forecast/benchmark cards such as `예상 도달` or `예상 CPM` |
| Basis panel | `이번 예측의 기준 확인` explains method, data basis, range, and sufficiency |
| Wording | Uses review language such as `기준선`, `검토 근거`, `예상 범위`, `데이터 충분성` |
| Export | `내보내기 준비 중` remains disabled/gated |
| Data safety | No real advertiser, campaign, account, email, token, API key, or personal data |

## 5. What To Say In The Demo

Use this framing:

- "Foresight는 확정 성과를 보장하는 도구가 아니라, 다음 캠페인 계획 전 검토할 예상 범위와 기준선을 보여주는 화면입니다."
- "이 화면에서는 예산, 기간, 업종, 목표, 타겟 조건을 고정하고 예측 결과와 근거 상태를 함께 봅니다."
- "`이번 예측의 기준 확인`은 수치만 보는 것이 아니라 어떤 데이터 근거와 충분성 상태에서 나온 결과인지 확인하는 부분입니다."

Do not say:

- "이 예산이 최적입니다."
- "이 결과가 보장됩니다."
- "정확히 이 성과가 나옵니다."
- "실제 광고주 성과입니다."

## 6. Failure Checks

| Symptom | Capture | Check |
|---|---|---|
| Symptom | Demo user captures | Authorized operator checks |
|---|---|---|
| Redirect loop | Login/error screenshot only | Foresight access, handoff, session config |
| `/` not visible | Safe page screenshot | Route protection and account role |
| Filters empty | `조건 설정` area screenshot | Supabase read config and benchmark data availability |
| `시뮬레이션 시작` fails | Result/error panel screenshot | `/api/predict` and `/api/predict-range` function logs |
| Python/model card fails | ML baseline/error area screenshot | Python/model endpoint presence and service health, without exposing values |
| Benchmark missing | `이번 예측의 기준 확인` screenshot | Demo scope may be too narrow; broaden target or industry |
| Copy too strong | Exact UI text screenshot | Mark for later wording fix |

Do not paste cookies, headers, request payloads, raw rows, environment values, tokens, or secrets into reports.

The demo user should not open browser developer tools, inspect cookies, copy request headers, copy request payloads, or check environment-variable presence. Those checks belong only to an authorized operator after Commander approval.

## 7. Do Not Click / Do Not Change

These are outside the safe live demo:

- `POST /api/py-retrain`
- `POST /api/meta-sync`
- Aggregate cache refresh or apply/write mode
- Vercel project settings, aliases, domains, production flags, or env vars
- Any debug route output such as `/api/debug-env` or `/api/debug-data`
- Any admin/export action that produces an official advertiser report
- Any restricted real advertiser case without Commander approval
- Browser developer tools inspection of cookies, headers, request payloads, or local/session storage

`/account` is troubleshooting-only. Do not open it during the main presentation flow unless Commander asks for access-state evidence.

## 8. 10-line Quick Run

1. Open the confirmed Foresight URL.
2. Log in with a Foresight-enabled demo/anonymized account.
3. Go to `/`.
4. Confirm `AdMate Foresight 성과 예측`.
5. Keep defaults or enter safe demo inputs in `조건 설정`.
6. Click `시뮬레이션 시작`.
7. Wait until `예측 결과` appears.
8. Check `예상 도달` or `예상 CPM`.
9. Check `이번 예측의 기준 확인`, `예상 범위`, and `데이터 충분성 판정`.
10. Stop if real advertiser/campaign/account/secret data appears.

## 9. Commander Handoff

- Created fixture: `outputs/admate-presentation-v2/test-fixtures/foresight-demo-scenarios.json`
- Created runbook: `outputs/admate-presentation-v2/foresight-live-demo-runbook.md`
- Main route: `/`
- Main flow: login → home simulator → safe inputs → `시뮬레이션 시작` → KPI card → `이번 예측의 기준 확인` → range/sufficiency review
- Expected screen labels: `예측 결과`, `이번 예측의 기준 확인`, `예상 범위`, `데이터 충분성 판정`, `예산별 도달 곡선`, `내보내기 준비 중`
- Remaining Commander checks: actual production/preview URL, demo account access, and whether demo numeric values should be blurred before deck use
