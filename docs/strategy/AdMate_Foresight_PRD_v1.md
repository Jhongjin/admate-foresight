# AdMate Foresight PRD v1

작성일: 2026-05-05
문서 상태: 1차 편입 문서
대상 repo: `D:\Projects\AdMate Foresight`

## 1. Product Purpose

AdMate Foresight는 AdMate 생태계에서 캠페인 성과 예측과 성과 분석/검증을 담당하는 제품이다.

Foresight의 목적은 미디어플래너와 데이터분석팀이 다음 질문에 빠르게 답할 수 있도록 돕는 것이다.

- 이 조건으로 캠페인을 집행하면 예상 CPM, CPC, CTR, Reach는 어느 정도인가?
- 유사 업종/목표/타겟 기준으로 현재 계획은 효율적인가?
- A/B 캠페인의 성과 차이는 실제로 의미 있는가?
- 집행 전후 성과 변화는 통계적으로 유의한가?
- 어떤 세그먼트에서 성과 개선 또는 악화가 두드러지는가?
- 이 결과를 광고주 또는 내부 보고서에 어떻게 설명해야 하는가?

Foresight는 사람의 판단을 대체하지 않는다. 예측과 검증 결과를 근거로 제공해 미디어플래너가 전략적 판단에 집중하도록 돕는다.

## 2. Users

주요 사용자:

- 미디어플래너
- 전략/제안 담당자
- 데이터분석팀
- 캠페인 운영 담당자
- 관리자 및 Reviewer

보조 사용자:

- AdMate Agent Core
- Hermes 학습/피드백 검토자
- 임원 보고 또는 광고주 보고 자료 작성자

## 3. Core Use Scenarios

### 3.1 Campaign Planning Prediction

사용자가 업종, 캠페인 목표, 성별, 연령, 예산, 기간을 입력한다.

Foresight는 과거 집계 데이터와 모델을 기반으로 예상 CPM, CPC, CPC Link, CPV, VTR, Reach를 반환한다.

### 3.2 Benchmark Review

사용자가 선택한 조건의 예측값을 업종 평균, 상위 효율선, 목표별 벤치마크와 비교한다.

Foresight는 예산별 도달 곡선과 효율 변화도 함께 보여준다.

### 3.3 A/B Campaign Comparison

사용자가 두 캠페인 또는 두 그룹의 비교 데이터를 업로드한다.

Foresight는 deterministic analysis engine으로 지표 차이, uplift, p-value, confidence interval, effect size를 계산하고, LLM layer는 해석 문장을 생성한다.

### 3.4 Before/After Performance Test

사용자가 캠페인 변경 전후 데이터를 업로드한다.

Foresight는 변경 전후 성과 차이가 통계적으로 유의한지 검정하고, 기간/요일/예산 차이 등 해석 주의사항을 함께 반환한다.

### 3.5 Segment Insight

사용자가 업종, 목표, 성별, 연령, 지면, 소재 형태 등 세그먼트가 포함된 데이터를 업로드한다.

Foresight는 성과 차이가 큰 세그먼트를 deterministic하게 산출하고, LLM은 보고서용 인사이트 후보를 작성한다.

### 3.6 Report Draft

사용자가 분석 결과를 보고서 문장으로 변환한다.

LLM은 raw data가 아니라 집계/익명화된 분석 결과 payload만 받아 planner-facing 또는 advertiser-facing narrative를 생성한다.

## 4. Existing Prediction Features

현재 PoC에 구현된 기능:

- 조건 기반 성과 예측
- 예산별 도달 시뮬레이션
- 시장 평균 및 업종 벤치마크 비교
- Top 20% 효율선 비교
- 시즌성 보정
- 빈도 기반 포화도 보정
- 타겟 품질 기반 CPC penalty
- TypeScript Ridge/WLS 회귀
- weighted average fallback
- Python FastAPI ML 예측
- Python 모델 재학습 API proxy
- Excel export
- 업종 트렌드 및 시즌 인사이트
- 경쟁사 모니터링 보조 화면

현재 예측 대상:

- CPM
- CPC
- CPC Link
- CPV
- VTR
- Reach
- Frequency

향후 추가 후보:

- CTR
- Conversion rate
- CPA
- ROAS
- Confidence range
- Prediction quality score

## 5. New LLM Performance Analysis Feature

신규 기능은 자연어 질문과 비교 데이터를 바탕으로 성과 차이를 검증하고 보고서 문장을 생성하는 기능이다.

핵심 원칙:

- 통계 계산은 LLM이 하지 않는다.
- Python deterministic engine이 분석 방법을 선택하고 계산한다.
- LLM은 계산 결과를 해석하고 문장화한다.
- raw campaign-level 데이터는 외부 LLM에 직접 전달하지 않는다.

사용자 입력:

- 자연어 질문
- 비교 유형: A/B, before/after, segment analysis
- CSV/XLSX 업로드 또는 선택된 집계 데이터
- 분석 대상 지표
- 기간, 캠페인 목표, 업종, 타겟 등 메타데이터

시스템 출력:

- 분석 유형
- 사용한 통계 기법
- 주요 지표 차이
- uplift
- confidence interval
- p-value
- effect size
- sample size
- 데이터 품질 경고
- deterministic summary
- LLM-generated interpretation
- report draft

## 6. Deterministic Analysis Engine Requirements

분석 엔진은 Python/FastAPI 구조 안에 추가하는 것을 기본 방향으로 한다.

필수 요구사항:

- CSV/XLSX 또는 structured JSON 입력을 검증한다.
- 필수 컬럼 누락, 타입 오류, 단위 오류를 반환한다.
- 분석 유형을 규칙 기반으로 선택한다.
- 최소 표본 수 기준을 적용한다.
- 결측치와 0 division을 방어한다.
- 이상치 처리 정책을 명시한다.
- metric 계산을 재현 가능하게 수행한다.
- 통계 검정을 deterministic하게 선택한다.
- 결과 payload에 분석 기준과 제한사항을 포함한다.
- LLM 전달용 payload는 익명화/집계/요약 형태로 별도 생성한다.

지원해야 할 분석:

- A/B comparison
- Before/after comparison
- Segment ranking
- Ratio/proportion comparison
- Numeric metric comparison
- Bootstrap confidence interval
- Multiple comparison correction

통계 기법 후보:

- Welch t-test
- Mann-Whitney U test
- Paired t-test
- Wilcoxon signed-rank test
- Two-proportion z-test
- Chi-square test
- Fisher exact test
- Bootstrap confidence interval
- Effect size: Cohen's d, Cliff's delta, odds ratio, relative uplift

분석 결과에는 다음을 포함한다.

- `analysis_type`
- `metric`
- `method`
- `sample_size`
- `baseline_value`
- `comparison_value`
- `absolute_diff`
- `relative_diff_pct`
- `p_value`
- `confidence_interval`
- `effect_size`
- `is_significant`
- `warnings`
- `limitations`
- `llm_safe_summary`

## 7. LLM Report Layer Requirements

LLM report layer는 deterministic analysis result를 받아 해석 문장을 생성한다.

LLM 입력 원칙:

- raw campaign-level row 전달 금지
- 광고주명, 캠페인명, 계정 ID 제거
- 필요 지표만 포함
- 집계값, 검정 결과, 경고, 제한사항만 포함
- prompt와 response 저장 여부는 보안 정책에 따라 결정

LLM 출력:

- 한 문단 요약
- 핵심 인사이트 3개 이하
- 주의사항
- 다음 액션 후보
- 광고주 보고서용 문장
- 내부 리뷰용 문장

LLM이 하지 말아야 할 것:

- 통계 재계산
- 유의성 결론 임의 변경
- 원자료 복원 시도
- 민감 데이터 노출
- 근거 없는 성과 원인 단정

## 8. Data / Security / ISMS Principles

Foresight는 광고 운영 데이터와 성과 데이터를 다루므로 초기 설계부터 보안/ISMS 원칙을 적용한다.

원칙:

- raw campaign-level 데이터는 외부 LLM에 직접 전달하지 않는다.
- 필요 시 익명화/집계/요약 후 전달한다.
- secret, API key, token, credential, env 값은 출력하지 않는다.
- `.env*` 파일은 커밋하지 않는다.
- 큰 Excel, CSV, raw data, cache, model artifact는 커밋하지 않는다.
- 최근 최대 6개월 데이터를 기본 벤치마크로 우선 사용한다.
- 6개월 초과 데이터는 장기 추세 참고용으로 분리한다.
- Net/Gross, markup, currency, period, filters는 metadata로 남긴다.
- LLM 사용량과 비용은 향후 `llm_usage_event` 형태로 기록한다.
- 예측 결과와 실제 성과는 향후 `planner_prediction`과 `actual_performance`로 연결한다.

Known risks:

- `/api/debug-env`는 env prefix/length를 노출할 수 있다.
- `/api/debug-data`는 sample row와 데이터 분포를 노출할 수 있다.
- `/api/py-retrain`은 권한 없이 모델 재학습을 트리거할 수 있다.
- `/api/meta-sync`는 권한 없이 외부 데이터 sync를 트리거할 수 있다.
- 경쟁사 모니터링과 scraping route는 외부 서비스 정책 및 runtime 안정성 검토가 필요하다.
- Supabase service role key 사용 경로는 서버 전용으로 유지하고 로그 노출을 막아야 한다.

이번 PRD 1차 범위에서는 위 API를 제거하거나 수정하지 않고 known risk로 문서화한다.

## 9. MVP Scope

MVP 1차 범위:

- Foresight repo 문서화
- 현재 예측 기능 정리
- 제품 경계와 보안 원칙 정리
- deterministic vs LLM 역할 분리
- 신규 분석 기능 PRD 작성

MVP 2차 범위:

- Python deterministic analysis module 추가
- A/B 비교 API 추가
- before/after 분석 API 추가
- 업로드 데이터 validation 추가
- LLM-safe summary payload 생성

MVP 3차 범위:

- Next.js 분석 화면 추가
- LLM report API 추가
- 분석 결과 다운로드
- audit/logging 요구사항 정리

## 10. Out of Scope

이번 편입 문서화 범위에서 제외한다.

- 기능 코드 구현
- API route 변경
- DB schema 변경
- Supabase RPC 변경
- debug API 제거
- retrain/sync API 보호 구현
- LLM provider 연동 구현
- Streamlit 전환
- Agent Core 정식 연동
- Compass/Sentinel/Lens 기능 흡수
- 실제 raw data 또는 model artifact 추가

제품 범위에서 제외한다.

- 정책/가이드 답변: Compass
- 캠페인 세팅 검수 및 실시간 감지: Sentinel
- 캡처/증빙 생성: Lens
- 권한, audit, workflow orchestration, Hermes 학습 반영: Agent Core

## 11. Phase Roadmap

### Phase 1. Repo Alignment

- Add `AGENTS.md`
- Replace template `README.md`
- Add this PRD
- Document known risks
- Keep existing Next.js + Python/FastAPI architecture

### Phase 2. Security Hardening

- Protect or remove debug APIs
- Add authorization to retrain and sync APIs
- Mask logs containing account or request metadata
- Define audit log requirements
- Define LLM usage event requirements

### Phase 3. Deterministic Analysis Engine

- Add `python/analysis.py`
- Add analysis request/response schema
- Support A/B and before/after analysis
- Add segment insight calculation
- Add validation and warnings

### Phase 4. LLM Report Layer

- Add LLM-safe summary generation
- Add report narrative endpoint
- Add planner-facing Korean summary
- Add advertiser-facing report draft
- Track LLM usage metadata

### Phase 5. Product Integration

- Add Foresight Tool API shape for Agent Core
- Store planner prediction records
- Connect actual performance records
- Prepare Hermes feedback and prediction quality review loop
- Align UI with Openclaw operating console theme

## 12. Acceptance Criteria

문서화 1차 acceptance criteria:

- `AGENTS.md`에 repo 역할, required reading, 제품 범위, 금지 사항, deterministic/LLM 역할 분리, 보안 원칙, 작업 전 보고 기준, 검증 명령, commit/push 원칙이 포함되어 있다.
- `README.md`에 프로젝트 소개, 현재 구현 기능, 주요 화면/API, 실행 방법, env 변수명, 데이터 흐름, build/lint 방법, 보안 주의사항, roadmap이 포함되어 있다.
- PRD에 제품 목적, 사용자, 사용 시나리오, 기존 예측 기능, 신규 분석 기능, deterministic engine, LLM report layer, 보안 원칙, MVP, 제외 범위, phase roadmap, acceptance criteria가 포함되어 있다.
- 기능 코드, API route, DB schema는 변경하지 않았다.
- secret, key, token, env 값은 출력하거나 문서화하지 않았다.
- 큰 데이터 파일 또는 model artifact를 추가하지 않았다.
- `git diff --check`를 통과한다.
- 가능한 경우 `npm run lint`, `npm run build` 결과를 보고한다.
