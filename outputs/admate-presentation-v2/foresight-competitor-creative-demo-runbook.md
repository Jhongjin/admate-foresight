# Foresight Competitor Creative Demo Runbook

Updated: 2026-06-28

Purpose: show a safe demo/anonymized flow for "경쟁사 소재/Meta 광고 라이브러리 기반 소재 흐름 확인" in the Foresight deployed UI. This is a report demo path, not a production scraper or official competitive intelligence report.

## 1. Start Point

| Item | Value |
|---|---|
| Product | AdMate Foresight |
| Route | `/competitor` |
| Screen | 경쟁사 소재 흐름 확인 |
| Login | Required if redirected to login |
| Data mode | Anonymized demo fallback |
| External lookup | Disabled/gated until Commander approval |

## 2. Safe Demo Inputs

Use only generic industry or category words.

| Input type | Recommended values |
|---|---|
| 업종 버튼 | `전체업종`, `뷰티`, `식음료`, `금융`, `관광/레저`, `전자`, `게임` |
| 키워드 데모 검색 | `뷰티`, `여행`, `게임`, `교육` |

Do not type a real advertiser name, campaign name, account ID, email, token, cookie, webhook URL, budget, spend, or real performance number.

## 3. Button-by-button Flow

1. Open the confirmed Foresight production or preview URL.
2. Sign in with a Foresight-enabled demo/anonymized account if redirected.
3. Go to `/competitor`.
4. Confirm the page title `경쟁사 소재 흐름 확인`.
5. Confirm the safety panel says live external lookup is held/gated.
6. Confirm anonymized creative cards are visible under `Demo creative cards`.
7. Click an industry chip such as `뷰티` or `관광/레저`.
8. Check the `시장 증거 확인 장부` panel updates the 탐색 범위 and 데이터 모드.
9. In `브랜드 · 키워드 데모 검색`, type a generic keyword such as `게임`.
10. Click `소재 흐름 보기`.
11. Confirm cards show demo advertiser/category/message/CTA/format/source label.

## 4. Expected Results

| Area | Expected result |
|---|---|
| Route | `/competitor` loads after login |
| Cards | Anonymized demo creative cards are shown even without Meta tokens |
| Search | Generic keyword or industry selection filters or broadens demo cards |
| Safety copy | The page frames results as `참고/검토 기준`, not guaranteed live evidence |
| Source label | Cards show `Demo fallback: Meta Ad Library style` |
| Live lookup | `라이브 조회 준비 중` remains disabled/gated |
| Data safety | No real advertiser, campaign, account ID, budget, performance, email, token, cookie, or secret |

## 5. What To Say In The Demo

- "이 화면은 경쟁사 소재를 확정 판정하는 기능이 아니라, Meta 광고 라이브러리에서 볼 수 있는 소재 흐름을 Foresight 기획 검토에 붙이는 데모입니다."
- "현재 보고 화면은 안전한 익명 demo fallback으로 구성되어 있어 외부 API나 스크래핑이 자동 실행되지 않습니다."
- "카드에서는 업종, 메시지 흐름, CTA, 포맷, source label을 보고 다음 캠페인 기획 시 참고할 소재 방향을 확인합니다."

Do not say:

- "실제 경쟁사 소재를 실시간으로 수집했습니다."
- "이 광고주는 실제 집행 중입니다."
- "이 소재가 가장 성과가 좋습니다."
- "이 결과가 광고 성과를 보장합니다."

## 6. Failure / Fallback Checks

| Symptom | Demo-safe fallback |
|---|---|
| `/competitor` redirects | Use a Foresight-enabled demo/anonymized account |
| Cards do not load | Refresh and use an 업종 버튼; the screen should still use demo fallback |
| Keyword shows broad results | Explain that unmatched safe keywords broaden to anonymized demo baseline |
| Live lookup requested | Stop; live Meta/Google/Playwright lookup needs Commander approval |
| Real data appears | Stop the demo and capture only a safe screenshot for follow-up review |

## 7. Do Not Click / Do Not Change

- Do not call `GET /api/meta-ads-scrape` manually during the report demo.
- Do not call `GET /api/meta-ads` or `GET /api/google-ads` manually during the report demo.
- Do not call `POST /api/meta-sync`.
- Do not inspect Vercel project settings, production flags, aliases, domains, or env values.
- Do not paste cookies, headers, request payloads, raw rows, account IDs, tokens, or secrets into reports.
- Do not enter real advertiser, campaign, account, budget, spend, performance, email, or personal data.

## 8. 10-line Quick Run

1. Open Foresight and sign in.
2. Go to `/competitor`.
3. Confirm `경쟁사 소재 흐름 확인`.
4. Confirm live lookup is gated.
5. Confirm demo creative cards are visible.
6. Click `뷰티`.
7. Check category/message/CTA/format/source label.
8. Type `게임`.
9. Click `소재 흐름 보기`.
10. Explain this as anonymized competitive creative flow, not real-time confirmed execution.

## 9. Commander Handoff Notes

- Main route: `/competitor`
- Demo API: `GET /api/competitor-demo`
- Demo data mode: anonymized fallback only
- External lookup policy: Meta/Google/Playwright live lookup remains gated for Commander approval
- Screenshot targets: page title, safety panel, `시장 증거 확인 장부`, and one demo creative card
