"""
model.py
Scikit-learn 기반 광고 성과 예측 모델 (CPM / CTR).

파이프라인 구조:
    ColumnTransformer
        ├── OneHotEncoder  ← 업종, 목표, 성별, 연령 (categorical)
        └── StandardScaler ← log(예산), 기간(일) (numerical)
    ↓
    MultiOutputRegressor(RandomForestRegressor)  또는 Ridge 회귀
        → [log_cpm, log_ctr] 예측 → exp() 역변환

모델 선택 기준: 교차검증 R² 평균. RF가 열세(데이터 부족 등)이면 Ridge 사용.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score
from sklearn.model_selection import cross_val_score
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger(__name__)

# ── 경로 ──────────────────────────────────────────────────────
MODELS_DIR = os.environ.get("MODELS_DIR", os.path.join(os.path.dirname(__file__), "models"))
MODEL_PATH = os.path.join(MODELS_DIR, "ad_model.joblib")
META_PATH  = os.path.join(MODELS_DIR, "model_meta.json")

# ── 특성 정의 ──────────────────────────────────────────────────
CAT_FEATURES = ["업종", "목표", "성별", "연령"]
NUM_FEATURES = ["log_budget", "기간"]

# 연령 순서형 (ordinal 대신 One-Hot 사용 → 더 일반적)
AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]


# ══════════════════════════════════════════════════════════════
# 1. 데이터 전처리 (DataFrame → Feature matrix)
# ══════════════════════════════════════════════════════════════
def _prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    월별 집계 DataFrame을 특성 행렬로 변환.

    입력 DataFrame 필수 컬럼:
        업종, 목표, 성별(없으면 '전체'), 연령(없으면 '전체'),
        sum_지출금액, avg_cpm, avg_cpc
    """
    feat = pd.DataFrame()

    # Categorical
    feat["업종"] = df.get("업종", pd.Series(["기타"] * len(df))).fillna("기타")
    feat["목표"] = df.get("목표", pd.Series([""] * len(df))).fillna("")
    feat["성별"] = df.get("성별", pd.Series(["전체"] * len(df))).fillna("전체")
    feat["연령"] = df.get("연령", pd.Series(["전체"] * len(df))).fillna("전체")

    # Numerical: log(예산) — 지출금액을 예산 프록시로 사용
    spend = pd.to_numeric(df.get("sum_지출금액", 0), errors="coerce").fillna(0).clip(lower=1)
    feat["log_budget"] = np.log1p(spend)

    # 기간: 날짜가 있으면 월 정보 → 기간 프록시(30일 고정), 없으면 30
    feat["기간"] = 30.0

    return feat[CAT_FEATURES + NUM_FEATURES]


def _prepare_targets(df: pd.DataFrame) -> pd.DataFrame:
    """log 변환된 타겟 반환: [log_cpm, log_ctr]"""
    cpm = pd.to_numeric(df["avg_cpm"], errors="coerce").fillna(0).clip(lower=1)
    cpc = pd.to_numeric(df["avg_cpc"], errors="coerce").fillna(0).clip(lower=1)

    # CTR ≈ CPM / (CPC × 1000)  (단위: %)
    ctr = (cpm / (cpc * 1000) * 100).clip(lower=0.001)

    return pd.DataFrame({
        "log_cpm": np.log(cpm),
        "log_ctr": np.log(ctr),
    })


# ══════════════════════════════════════════════════════════════
# 2. 파이프라인 빌드
# ══════════════════════════════════════════════════════════════
def _build_pipeline(estimator: Any) -> Pipeline:
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                CAT_FEATURES,
            ),
            ("num", StandardScaler(), NUM_FEATURES),
        ],
        remainder="drop",
    )
    return Pipeline([
        ("pre", preprocessor),
        ("model", MultiOutputRegressor(estimator)),
    ])


# ══════════════════════════════════════════════════════════════
# 3. 학습 & 모델 저장
# ══════════════════════════════════════════════════════════════
def train(df: pd.DataFrame) -> dict:
    """
    DataFrame으로 모델을 학습하고 joblib으로 저장.

    Returns:
        {
            "model_type": "random_forest" | "ridge",
            "r2_cpm": float,
            "r2_ctr": float,
            "n_samples": int,
            "trained_at": ISO8601 string,
        }
    """
    os.makedirs(MODELS_DIR, exist_ok=True)

    X = _prepare_features(df)
    Y = _prepare_targets(df)
    n = len(X)
    logger.info(f"[model] 학습 시작 — {n}행")

    # 두 모델 교차검증 (CV=5, R² 평균)
    cv_folds = min(5, max(2, n // 20))  # 샘플이 적으면 fold 줄임

    results = {}
    for name, est in [
        ("random_forest", RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)),
        ("ridge",         Ridge(alpha=1.0)),
    ]:
        pipe = _build_pipeline(est)
        try:
            scores = cross_val_score(pipe, X, Y, cv=cv_folds, scoring="r2", n_jobs=-1)
            results[name] = {"pipe": pipe, "cv_r2": float(np.mean(scores))}
            logger.info(f"[model] {name}: cv_R²={results[name]['cv_r2']:.4f}")
        except Exception as e:
            logger.warning(f"[model] {name} CV 실패: {e}")

    if not results:
        raise RuntimeError("모든 모델 학습 실패")

    # 더 높은 CV R² 모델 선택
    best_name = max(results, key=lambda k: results[k]["cv_r2"])
    best_pipe = results[best_name]["pipe"]
    logger.info(f"[model] 선택된 모델: {best_name}")

    # 전체 데이터로 최종 학습
    best_pipe.fit(X, Y)

    # 학습 데이터 기준 R² (참고용)
    Y_pred = best_pipe.predict(X)
    r2_cpm = float(r2_score(Y["log_cpm"], Y_pred[:, 0]))
    r2_ctr = float(r2_score(Y["log_ctr"], Y_pred[:, 1]))

    # 저장
    joblib.dump(best_pipe, MODEL_PATH, compress=3)
    meta = {
        "model_type":  best_name,
        "r2_cpm":      round(r2_cpm, 4),
        "r2_ctr":      round(r2_ctr, 4),
        "cv_r2":       round(results[best_name]["cv_r2"], 4),
        "n_samples":   n,
        "trained_at":  datetime.now(timezone.utc).isoformat(),
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

    logger.info(f"[model] 저장 완료 → {MODEL_PATH}  R²_cpm={r2_cpm:.4f}, R²_ctr={r2_ctr:.4f}")
    return meta


# ══════════════════════════════════════════════════════════════
# 4. 모델 로드 & 예측
# ══════════════════════════════════════════════════════════════
_pipeline: Pipeline | None = None
_meta: dict = {}


def load_model() -> bool:
    """디스크에서 모델을 메모리에 로드. 성공 여부 반환."""
    global _pipeline, _meta
    if not os.path.exists(MODEL_PATH):
        return False
    try:
        _pipeline = joblib.load(MODEL_PATH)
        if os.path.exists(META_PATH):
            with open(META_PATH, encoding="utf-8") as f:
                _meta = json.load(f)
        logger.info(f"[model] 모델 로드 완료: {_meta.get('model_type')} (학습: {_meta.get('trained_at')})")
        return True
    except Exception as e:
        logger.error(f"[model] 모델 로드 실패: {e}")
        return False


def predict(
    업종: str = "",
    목표: str = "",
    성별: str = "",
    연령: str = "",
    예산: float = 10_000_000,
    기간: float = 30,
) -> dict:
    """
    단일 조건으로 CPM / CTR / CPC / 도달 예측.

    Returns:
        {
            "cpm": int,
            "ctr": float,   # % 단위
            "cpc": int,
            "reach": int,   # 예산 기반 도달 추정
            "r2_cpm": float,
            "r2_ctr": float,
            "model_type": str,
            "trained_at": str,
        }
    """
    if _pipeline is None:
        raise RuntimeError("모델이 로드되어 있지 않습니다. /retrain 을 먼저 호출하세요.")

    row = pd.DataFrame([{
        "업종":       업종 or "기타",
        "목표":       목표 or "",
        "성별":       성별 or "전체",
        "연령":       연령 or "전체",
        "log_budget": np.log1p(max(예산, 1)),
        "기간":       float(기간),
    }])

    log_pred = _pipeline.predict(row)[0]  # [log_cpm, log_ctr]
    cpm_pred = float(np.exp(log_pred[0]))
    ctr_pred = float(np.exp(log_pred[1]))  # %

    # CPC 역산: CPC = CPM / (CTR/100 × 1000)
    cpc_pred = cpm_pred / (ctr_pred / 100 * 1000) if ctr_pred > 0 else 0.0

    # 도달 추정: (예산 / CPM) × 1000  (단순 선형, 포화 모델 미적용)
    reach_est = int((예산 / cpm_pred) * 1000) if cpm_pred > 0 else 0

    return {
        "cpm":        int(round(cpm_pred)),
        "ctr":        round(ctr_pred, 3),
        "cpc":        int(round(cpc_pred)),
        "reach":      reach_est,
        "r2_cpm":     _meta.get("r2_cpm", 0),
        "r2_ctr":     _meta.get("r2_ctr", 0),
        "cv_r2":      _meta.get("cv_r2", 0),
        "model_type": _meta.get("model_type", "unknown"),
        "trained_at": _meta.get("trained_at", ""),
        "n_samples":  _meta.get("n_samples", 0),
    }


def get_meta() -> dict:
    return dict(_meta)


def is_loaded() -> bool:
    return _pipeline is not None
