# AdMate Foresight AGENTS.md v1

작성일: 2026-05-05

## 1. Repo Role

이 repo는 AdMate 생태계의 `AdMate Foresight` 제품 repo다.

AdMate Foresight는 과거 광고 데이터와 벤치마크를 기반으로 캠페인 기획 단계의 예상 성과를 제공하고, 집행 전후 또는 A/B 비교 데이터의 성과 차이가 통계적으로 의미 있는지 검증하는 미디어 플래닝 및 성과 분석 제품이다.

현재 repo는 기존 `Ad-Planner AI` PoC에서 출발했으며, 다음 기능을 포함한다.

- Meta 중심 캠페인 조건 기반 CPM, CPC, CPC Link, CPV, VTR, Reach 예측
- 업종/목표/타겟/예산 조건별 벤치마크 시뮬레이션
- Supabase 집계 데이터 기반 Next.js 예측 API
- Python FastAPI 및 scikit-learn 기반 ML 예측 엔진
- 향후 LLM 기반 성과 분석/자동 보고서 기능을 위한 기반 repo

## 2. Required Reading

작업 전 아래 중앙 문서를 우선 읽는다. 중앙 문서가 source of truth이며, repo 내부 문서와 충돌하면 중앙 문서를 우선한다.

1. `D:\Projects\admate-docs\AGENTS.md`
2. `D:\Projects\admate-docs\README.md`
3. `D:\Projects\admate-docs\INDEX.md`
4. `D:\Projects\admate-docs\strategy\05_AdMate_Product_Map_v1.md`
5. `D:\Projects\admate-docs\strategy\06_AdMate_Agent_Core_Operating_Model_v1.md`
6. `D:\Projects\admate-docs\strategy\08_AdMate_Unified_Data_Learning_Governance_v1.md`
7. `D:\Projects\admate-docs\strategy\14_AdMate_Repo_Codex_Integration_Guide_v1.md`
8. `D:\Projects\admate-docs\design\openclaw-theme-reference.md`
9. `D:\Projects\AdMate Foresight\README.md`
10. `D:\Projects\AdMate Foresight\docs\strategy\AdMate_Foresight_PRD_v1.md`

## 3. Product Scope

Foresight가 담당하는 범위:

- 캠페인 조건 기반 성과 예측
- 업종/목표/타겟 벤치마크
- 예산별 도달 및 효율 시뮬레이션
- 전후 성과 유의성 분석
- A/B 캠페인 비교 분석
- 세그먼트별 성과 차이 분석
- 분석 결과의 운영자용 해석 및 보고서 문장화
- 예측값과 실제 성과의 차이 기록 및 향후 품질 평가

Foresight가 담당하지 않는 범위:

- 광고 정책/가이드 전문 답변: AdMate Compass 담당
- 캠페인 시작 전 세팅 검수 및 실시간 이상 감지: AdMate Sentinel 담당
- 광고 캡처 및 증빙 이미지 생성: AdMate Lens 담당
- 제품 간 workflow 실행, 권한, audit log, Hermes 학습 반영: AdMate Agent Core 담당

## 4. Non-negotiable Rules

- secret, API key, token, credential, env 값을 출력하거나 문서에 저장하지 않는다.
- `.env`, `.env.local`, `.env.production`, `.env*.local` 파일을 커밋하지 않는다.
- raw campaign-level 데이터는 외부 LLM에 직접 전달하지 않는다.
- LLM에는 필요한 경우 익명화, 집계, 요약된 최소 데이터만 전달한다.
- 큰 Excel, CSV, raw data, model artifact는 repo에 커밋하지 않는다.
- API route, DB schema, Supabase RPC, Python model behavior를 변경해야 할 때는 먼저 위험 요소와 migration 필요성을 보고한다.
- Streamlit로 새로 갈아타지 않는다. 현재 Next.js + Python/FastAPI 구조를 우선 존중한다.
- debug, retrain, sync 계열 API는 보안 위험이 있으므로 운영 반영 전 권한/감사/차단 정책을 검토한다.
- unrelated 파일을 수정하지 않는다.

## 5. Deterministic vs LLM Roles

통계 기법 선택과 계산은 LLM이 아니라 코드가 deterministic하게 수행한다.

Deterministic engine이 담당할 것:

- 업로드 데이터 스키마 검증
- 지표 계산: CPM, CPC, CTR, VTR, CPV, Reach, Spend, Conversion 등
- A/B 비교 분석
- 전후 성과 분석
- 세그먼트별 차이 분석
- 통계 기법 선택 규칙
- p-value, confidence interval, effect size, uplift, sample size 기준 계산
- 이상치, 결측치, 최소 표본 수 처리
- 다중 비교 보정
- 최근 최대 6개월 데이터 우선 필터
- LLM 전달용 익명화/집계/요약 payload 생성

LLM layer가 담당해도 되는 것:

- 분석 결과 해석 문장화
- 보고서 초안 생성
- 미디어플래너용 요약
- 광고주 보고용 narrative 작성
- 인사이트 후보 제안
- 차트/표 캡션 작성

LLM이 담당하면 안 되는 것:

- 통계 검정 선택을 임의 판단
- p-value, confidence interval, uplift를 직접 계산
- raw campaign-level 데이터 원문 분석
- secret 또는 credential 추론/출력
- 권한 없는 데이터에 대한 설명 생성

## 6. Security / ISMS Principles

- raw campaign data는 최소 접근 원칙으로 처리한다.
- 외부 LLM/API 사용 시 전달 필드를 최소화하고, 민감 정보는 제거한다.
- 광고주명, 캠페인명, 계정 ID, 예산/단가 계약 정보, 개인 식별 정보는 LLM payload에서 제거하거나 마스킹한다.
- 권한 변경, 학습 반영, 고비용 작업, 외부 Tool 호출은 향후 audit log 대상이다.
- `SUPABASE_SERVICE_ROLE_KEY`, `META_ACCESS_TOKEN`, `META_APP_SECRET`, LLM provider key 등은 서버 전용으로만 취급한다.
- 문서에는 env 변수명만 적고 값은 적지 않는다.
- debug API가 env prefix, sample row, 데이터 분포를 노출할 수 있으므로 운영에서는 비활성화 또는 관리자 보호가 필요하다.

## 7. Work Report Before Editing

기능 코드 또는 데이터 구조를 수정하기 전에는 먼저 보고한다.

보고 항목:

1. 현재 관련 코드 구조
2. 수정 후보 파일
3. 예상 위험 요소
4. 구현 계획
5. 테스트 계획
6. rollback 방법

문서만 수정하는 경우에도 변경 파일과 문서 목적을 먼저 명확히 한다.

## 8. Verification Commands

가능한 경우 작업 후 아래 명령을 실행한다.

```powershell
git diff --check
npm run lint
npm run build
```

Python FastAPI 관련 변경이 있을 때는 별도로 확인한다.

```powershell
cd python
python -m pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

환경변수나 외부 서비스가 없어 검증이 실패하면 실패 원인을 값 없이 보고한다.

## 9. Commit / Push Rules

- commit, push, PR 생성은 사용자 승인 전 금지한다.
- main branch에 직접 push하지 않는다.
- commit 전 `git status --short`, `git diff --stat`, `git diff --check`를 확인한다.
- secret, env, 큰 데이터 파일, model artifact가 staged되지 않았는지 확인한다.
- commit 메시지는 작업 범위가 드러나게 작성한다.
