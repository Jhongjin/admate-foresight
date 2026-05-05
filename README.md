# AdMate Foresight

AdMate Foresight는 나스미디어 데이터분석팀이 구축하는 AdMate 생태계의 미디어 플래닝 및 성과 분석 제품이다.

기존 `Ad-Planner AI` PoC를 기반으로 하며, 캠페인 조건 기반 성과 예측과 업종/타겟 벤치마크를 제공한다. 향후에는 자연어 질문과 비교 데이터를 바탕으로 A/B 캠페인 비교, 전후 성과 유의성 분석, 세그먼트별 인사이트, AI 리포트 자동화를 제공한다.

AdMate 전체 제품군 안에서 Foresight는 다음 역할을 맡는다.

```text
Foresight
= 다음 캠페인의 성과를 예측하고,
  집행 결과의 차이가 실제로 의미 있는지 검증하는 제품
```

## Current Implementation

현재 repo는 Next.js 앱과 Python FastAPI ML 엔진이 함께 있는 PoC 구조다.

구현된 기능:

- 캠페인 조건 기반 CPM, CPC, CPC Link, CPV, VTR, Reach 예측
- 업종, 목표, 성별, 연령, 예산, 기간 조건 입력
- 예산별 도달 곡선 및 예산 구간별 성과 비교
- 업종별 시장 평균 및 상위 효율선 비교
- 시즌성, 포화도, 타겟 품질 기반 보정
- Supabase RPC 집계 데이터 로딩
- TypeScript Ridge/WLS 회귀 및 weighted average fallback
- Python FastAPI + scikit-learn 기반 ML 예측
- 모델 재학습 프록시
- 업종별 트렌드, 시즌 인사이트, 경쟁사 모니터링 화면
- Excel 리포트 내보내기

아직 구현되지 않은 기능:

- LLM 기반 성과 분석 해석
- A/B 캠페인 비교 분석 엔진
- 전후 성과 유의성 검정 엔진
- 세그먼트별 자동 인사이트
- LLM 사용량/비용 기록
- Foresight 예측 결과와 실제 성과의 정식 저장/비교 구조
- Agent Core audit log 연계

## Main Screens

- `/`: 성과 예측 시뮬레이터
- `/trends`: 업종별 트렌드
- `/insights`: 시즌 인사이트
- `/competitor`: 경쟁사 모니터링

## Main APIs

Prediction and benchmark:

- `GET /api/filters`
- `POST /api/predict`
- `POST /api/predict-range`
- `GET /api/regression-summary`

Python ML proxy:

- `POST /api/py-predict`
- `POST /api/py-retrain`

Trend and insight:

- `GET /api/trends`
- `GET /api/breakdown`
- `GET /api/seasonality`
- `GET /api/insights`

Data collection and competitor monitoring:

- `POST /api/meta-sync`
- `GET /api/meta-ads`
- `GET /api/meta-ads-scrape`
- `GET /api/google-ads`

Export and diagnostics:

- `POST /api/export`
- `GET /api/debug-env`
- `GET /api/debug-data`

Note: `debug`, `retrain`, and `sync` APIs are known security risks until access control, audit logging, and environment-based protection are added.

## Next.js Development

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

Build and lint:

```powershell
npm run lint
npm run build
```

## Python FastAPI ML Engine

The Python service lives in `python/`.

Install dependencies:

```powershell
cd python
python -m pip install -r requirements.txt
```

Run locally:

```powershell
uvicorn main:app --reload --port 8000
```

When running Next.js locally, set `PYTHON_API_URL` to the Python API base URL, for example a local FastAPI server URL. Do not commit env files.

Python endpoints:

- `POST /predict`
- `POST /retrain`
- `GET /model-info`
- `GET /health`

## Environment Variables

Only variable names are documented here. Do not write values in this file, logs, commits, or issue comments.

Supabase:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Python ML:

- `PYTHON_API_URL`
- `ALLOWED_ORIGINS`
- `MODELS_DIR`

Meta and competitor monitoring:

- `META_ACCESS_TOKEN`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_AD_ACCOUNT_ID`
- `META_BUSINESS_ID`

Chromium / scraping runtime:

- `CHROMIUM_PACK_VER`
- `CHROMIUM_REMOTE_URL`

Never commit:

- `.env`
- `.env.local`
- `.env.production`
- `.env*.local`
- API keys, service role keys, access tokens, credentials

## Data Flow

Current Next.js prediction flow:

```text
Supabase ad_data
→ RPC get_monthly_aggregates / get_demographic_aggregates
→ lib/xlsxLoader.ts
→ lib/predictor.ts / lib/regression.ts
→ app/api/predict and related API routes
→ React UI
```

Current Python ML flow:

```text
Supabase RPC
→ python/data_loader.py
→ python/model.py
→ python/main.py FastAPI
→ app/api/py-predict proxy
→ React UI
```

Future LLM analysis flow:

```text
Uploaded comparison data or selected campaign summary
→ deterministic Python analysis engine
→ anonymized/aggregated result payload
→ LLM report layer
→ planner-facing explanation and report draft
```

## Deterministic Analysis Principle

Statistical calculation must be deterministic and implemented in code.

The deterministic engine must handle:

- schema validation
- metric calculation
- A/B comparison
- before/after analysis
- segment-level comparison
- statistical test selection
- p-value, confidence interval, effect size, uplift
- missing values, outliers, minimum sample size
- multiple comparison correction
- anonymized summary payload generation for LLM

The LLM may only handle:

- result interpretation
- report wording
- insight candidate phrasing
- executive or planner summary
- chart/table captions

Raw campaign-level data must not be sent directly to external LLMs.

## Security Notes

Known risks:

- `/api/debug-env` exposes env presence and prefixes. It must be disabled or protected before production use.
- `/api/debug-data` can expose sample rows and data distribution. It must be disabled or protected before production use.
- `/api/py-retrain` can trigger model retraining and should require authorization.
- `/api/meta-sync` can trigger external data sync and should require authorization and audit logging.
- Meta/Supabase tokens must remain server-only.
- LLM/report features must send only anonymized or aggregated data.
- Large raw Excel, CSV, cache files, and model artifacts must not be committed.

Large file policy:

- Do not commit raw Excel, CSV, parquet, cache JSON, or model artifact files.
- Keep production data in Supabase or approved storage.
- Keep only small anonymized fixtures in the repo when tests require them.
- Keep `python/models/` ignored.

## Product Boundaries

- Compass answers policy and guide questions.
- Sentinel validates setup and detects live campaign issues.
- Lens creates capture and evidence images.
- Foresight predicts and analyzes campaign performance.
- Agent Core connects tools, records actions, manages permissions, audit logs, cost events, and Hermes learning.

Foresight may expose Tool APIs for Agent Core in the future, but it should not absorb the responsibilities of the other products.

## Roadmap

Phase 1: Foresight repo alignment

- Add AGENTS.md, README, PRD
- Document security risks
- Preserve current Next.js + Python/FastAPI architecture

Phase 2: Security hardening

- Protect or remove debug APIs
- Add authorization for retrain and sync APIs
- Define audit and LLM usage event requirements

Phase 3: Deterministic analysis MVP

- Add Python analysis engine
- Support A/B, before/after, and segment analysis
- Return structured statistical result payloads

Phase 4: LLM report layer

- Generate Korean planner-facing interpretation
- Generate report-ready narrative
- Enforce anonymized/aggregated LLM payloads

Phase 5: Agent Core integration

- Add Foresight Tool API shape
- Connect planner prediction and actual performance records
- Prepare Hermes feedback and prediction quality review loop
