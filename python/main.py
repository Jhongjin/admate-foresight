"""
main.py
Ad Planner ML Engine — FastAPI 애플리케이션

엔드포인트:
    POST /predict      — CPM / CTR / CPC / 도달 예측
    POST /retrain      — 최신 Supabase 데이터로 모델 재학습
    GET  /model-info   — 현재 모델 메타정보 (R², 학습일시, 샘플 수)
    GET  /health       — 헬스체크

실행 (로컬):
    cd python
    cp .env.example .env   # 환경변수 설정
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
import os
import secrets
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import model as m

# ── 환경변수 ──────────────────────────────────────────────────
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

INTERNAL_KEY_HEADER = "x-admate-internal-key"
INTERNAL_KEY_ENV_NAMES = (
    "ADMATE_INTERNAL_KEY",
    "FORESIGHT_INTERNAL_KEY",
    "INTERNAL_API_KEY",
)


def _get_internal_key() -> Optional[str]:
    for name in INTERNAL_KEY_ENV_NAMES:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return None


def _require_internal_key(provided: Optional[str]) -> None:
    expected = _get_internal_key()
    if not expected:
        raise HTTPException(status_code=503, detail="Internal access is not configured.")
    if not provided or not secrets.compare_digest(provided, expected):
        raise HTTPException(status_code=403, detail="Forbidden")


# ══════════════════════════════════════════════════════════════
# Lifespan: 시작 시 모델 자동 로드
# ══════════════════════════════════════════════════════════════
@asynccontextmanager
async def lifespan(app: FastAPI):
    loaded = m.load_model()
    if not loaded:
        logger.info("[startup] 저장된 모델 없음 → Supabase 데이터로 초기 학습 시작")
        try:
            from data_loader import load_monthly_data

            df = load_monthly_data()
            m.train(df)
            m.load_model()
            logger.info("[startup] 초기 학습 완료")
        except Exception as e:
            logger.warning(f"[startup] 초기 학습 실패 (예측 불가): {e}")
    yield
    logger.info("[shutdown] ML 서비스 종료")


# ══════════════════════════════════════════════════════════════
# FastAPI 앱
# ══════════════════════════════════════════════════════════════
app = FastAPI(
    title="Ad Planner ML Engine",
    description="Scikit-learn 기반 Meta 광고 성과 예측 API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — Next.js 개발서버 + Vercel 배포 URL 허용
_origins_raw = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
_origins = [o.strip() for o in _origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", INTERNAL_KEY_HEADER],
)


# ══════════════════════════════════════════════════════════════
# 스키마 (Pydantic)
# ══════════════════════════════════════════════════════════════
class PredictRequest(BaseModel):
    업종:  Optional[str] = Field(default="", description="예: 뷰티, 식음료, 패션")
    목표:  Optional[str] = Field(default="", description="예: OUTCOME_AWARENESS")
    성별:  Optional[str] = Field(default="", description="male | female | (빈값=전체)")
    연령:  Optional[str] = Field(default="", description="예: 25-34 | (빈값=전체)")
    노출위치: list[str] = Field(default_factory=list, description="예: ['IG 피드', 'FB 스토리']")
    소재형태: Optional[str] = Field(default="", description="이미지 | 동영상 | 슬라이드 | 컬렉션")
    예산:  float          = Field(default=10_000_000, ge=1_000, description="총 캠페인 예산 (원)")
    기간:  float          = Field(default=30, ge=1, le=365, description="캠페인 기간 (일)")


class PredictResponse(BaseModel):
    cpm:                    int
    ctr:                    float   # % 단위 (예: 1.5 → 1.5%)
    cpc:                    int
    reach:                  int
    frequency:              float
    seasonality_multiplier: float
    seasonality_reason:     str
    saturation_warning:     bool
    is_cross_estimate:      bool
    placement_factor:       float
    demo_factor:            float
    creative_factor:        float
    is_creative_fallback:   bool
    lw_ensemble_active:     bool
    lw_cpm:                 Optional[int]
    lw_rf_weight:           Optional[float]
    r2_cpm:                 float
    r2_ctr:                 float
    cv_r2:                  float
    model_type:             str
    trained_at:             str
    n_samples:              int


class RetrainResponse(BaseModel):
    message:    str
    model_type: str
    r2_cpm:     float
    r2_ctr:     float
    cv_r2:      float
    n_samples:  int
    trained_at: str


class ModelInfoResponse(BaseModel):
    loaded:     bool
    model_type: Optional[str]
    r2_cpm:     Optional[float]
    r2_ctr:     Optional[float]
    cv_r2:      Optional[float]
    n_samples:  Optional[int]
    trained_at: Optional[str]


# ══════════════════════════════════════════════════════════════
# 엔드포인트
# ══════════════════════════════════════════════════════════════

@app.post("/predict", response_model=PredictResponse, summary="광고 성과 예측")
def predict(
    req: PredictRequest,
    x_admate_internal_key: Optional[str] = Header(default=None),
):
    """
    [업종 / 타겟 / 기간 / 예산] → [CPM, CTR, CPC, 도달 추정]

    - **cpm**: 1,000회 노출당 비용 (원)
    - **ctr**: 클릭률 (%)
    - **cpc**: 클릭당 비용 (원)
    - **reach**: 예산 대비 도달 추정 수 (명)
    """
    _require_internal_key(x_admate_internal_key)
    if not m.is_loaded():
        raise HTTPException(
            status_code=503,
            detail="모델이 준비되지 않았습니다. /retrain 을 먼저 호출하세요.",
        )
    try:
        result = m.predict(
            업종=req.업종 or "",
            목표=req.목표 or "",
            성별=req.성별 or "",
            연령=req.연령 or "",
            노출위치=req.노출위치 or [],
            소재형태=req.소재형태 or "",
            예산=req.예산,
            기간=req.기간,
        )
        return PredictResponse(**result)
    except Exception:
        logger.exception("[predict] 예측 오류")
        raise HTTPException(status_code=500, detail="Prediction failed.")


@app.post("/retrain", response_model=RetrainResponse, summary="모델 재학습")
def retrain(x_admate_internal_key: Optional[str] = Header(default=None)):
    """
    Supabase에서 최신 데이터를 다시 불러와 모델을 재학습합니다.

    - 학습 완료 후 **R-squared (R²)** 및 교차검증 점수 반환
    - 새 모델은 즉시 메모리에 적재되어 다음 예측에 사용
    """
    _require_internal_key(x_admate_internal_key)
    try:
        from data_loader import load_monthly_data

        logger.info("[retrain] 데이터 로딩 시작")
        df = load_monthly_data()
        meta = m.train(df)
        m.load_model()  # 새 모델을 메모리에 반영
        return RetrainResponse(
            message=f"모델 갱신 완료 — {meta['n_samples']:,}개 샘플, R²(CPM)={meta['r2_cpm']:.4f}",
            **meta,
        )
    except Exception:
        logger.exception("[retrain] 재학습 오류")
        raise HTTPException(status_code=500, detail="Model retrain failed.")


@app.get("/model-info", response_model=ModelInfoResponse, summary="현재 모델 정보")
def model_info():
    """현재 메모리에 로드된 모델의 메타정보를 반환합니다."""
    meta = m.get_meta()
    return ModelInfoResponse(
        loaded=m.is_loaded(),
        model_type=meta.get("model_type"),
        r2_cpm=meta.get("r2_cpm"),
        r2_ctr=meta.get("r2_ctr"),
        cv_r2=meta.get("cv_r2"),
        n_samples=meta.get("n_samples"),
        trained_at=meta.get("trained_at"),
    )


@app.get("/health", summary="헬스체크")
def health():
    """서비스 상태 확인 (Vercel / Railway 헬스체크용)"""
    return {
        "status": "ok",
        "model_loaded": m.is_loaded(),
        "model_type": m.get_meta().get("model_type", "none"),
    }
