"""
model.py
Scikit-learn 기반 광고 성과 예측 모델 (CPM / CTR).

파이프라인 구조:
    ColumnTransformer
        ├── OneHotEncoder  ← 업종, 목표, 성별, 연령 (categorical)
        └── StandardScaler ← log(예산), 기간(일) (numerical)
    ↓
    MultiOutputRegressor(RandomForestRegressor / HistGradientBoostingRegressor) 또는 Ridge 회귀
        → [log_cpm, log_ctr] 예측 → exp() 역변환

모델 선택 기준: 교차검증 R² 평균. 부스팅/트리 계열이 열세(데이터 부족 등)이면 Ridge 사용.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date, datetime, timezone
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor, RandomForestRegressor
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
# Business constants mirror the TypeScript simulator so the ML baseline does
# not over-promise linear reach at larger budgets.
BETA = 0.864
FREQ_GAMMA = 0.044
REF_BUDGET = 1_000_000.0
SAT_FREQ_THRESHOLD = 2.0
SAT_CPM_RATE = 0.25
DEFAULT_FREQUENCY = 1.5

CAT_FEATURES = ["업종", "목표", "성별", "연령", "노출위치", "소재형태"]
NUM_FEATURES = ["log_budget", "기간"]

DEFAULT_CREATIVE_FACTORS: dict[str, float] = {
    "이미지": 1.00,
    "동영상": 0.85,
    "슬라이드": 0.92,
    "컬렉션": 1.05,
}

FACTORS_PATH = os.path.join(MODELS_DIR, "adjustment_factors.json")

# 연령 순서형 (ordinal 대신 One-Hot 사용 → 더 일반적)
AGE_ORDER = ["18-24", "25-34", "35-44", "45-54", "55-64", "65+"]


def _get_seasonality() -> tuple[float, str]:
    today = date.today()
    month, day = today.month, today.day
    if month == 12:
        return 1.4, "연말 성수기 (12월)"
    if month == 11:
        return 1.3, "블랙프라이데이 시즌 (11월)"
    if (month == 1 and day >= 22) or (month == 2 and day <= 16):
        return 1.2, "설날 연휴 시즌"
    if (month == 9 and day >= 15) or (month == 10 and day <= 10):
        return 1.2, "추석 연휴 시즌"
    return 1.0, ""


def _apply_saturation(base_cpm: float, frequency: float) -> float:
    if frequency <= SAT_FREQ_THRESHOLD:
        return base_cpm
    over_ratio = (frequency - SAT_FREQ_THRESHOLD) / SAT_FREQ_THRESHOLD
    surcharge = 1.0 + over_ratio * SAT_CPM_RATE
    return base_cpm * min(surcharge, 1.7)


def _calc_reach(cpm: float, base_frequency: float, budget: float) -> tuple[int, float]:
    adjusted_frequency = base_frequency * (budget / REF_BUDGET) ** FREQ_GAMMA
    if cpm <= 0 or adjusted_frequency <= 0:
        return 0, round(adjusted_frequency, 2)
    linear_reach = (budget / cpm) * 1000 / adjusted_frequency
    diminishing = (budget / REF_BUDGET) ** (BETA - 1) if budget > 0 else 1.0
    return int(round(linear_reach * diminishing)), round(adjusted_frequency, 2)


def _clean_string_series(df: pd.DataFrame, column: str, default: str) -> pd.Series:
    if column not in df.columns:
        return pd.Series([default] * len(df), index=df.index)
    return df[column].fillna(default).astype(str).replace("", default)


def _safe_weighted_average(values: pd.Series, weights: pd.Series) -> float:
    valid = pd.to_numeric(values, errors="coerce").fillna(0)
    safe_weights = pd.to_numeric(weights, errors="coerce").fillna(0).clip(lower=0)
    total_weight = float(safe_weights.sum())
    if total_weight <= 0:
        return float(valid.mean()) if len(valid) > 0 else 0.0
    return float(np.average(valid, weights=safe_weights.clip(lower=1)))


def _bounded_factor(value: float, lower: float = 0.65, upper: float = 1.75) -> float:
    if not np.isfinite(value) or value <= 0:
        return 1.0
    return float(min(max(value, lower), upper))


def _winsorize_series(
    values: pd.Series,
    lower_quantile: float,
    upper_quantile: float,
    min_samples: int = 20,
) -> pd.Series:
    safe_values = pd.to_numeric(values, errors="coerce").fillna(0.0)
    if len(safe_values) < min_samples:
        return safe_values

    positive_values = safe_values[safe_values > 0]
    if len(positive_values) < min_samples:
        return safe_values

    lower = float(positive_values.quantile(lower_quantile))
    upper = float(positive_values.quantile(upper_quantile))
    if not np.isfinite(lower) or not np.isfinite(upper) or lower <= 0 or upper <= lower:
        return safe_values
    return safe_values.clip(lower=lower, upper=upper)


def _normalize_placements(value: list[str] | str | None) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        items = [value]
    else:
        items = list(value)
    return [item.strip() for item in items if isinstance(item, str) and item.strip()]


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
    feat["업종"] = _clean_string_series(df, "업종", "기타")
    feat["목표"] = _clean_string_series(df, "목표", "")
    feat["성별"] = _clean_string_series(df, "성별", "전체")
    feat["연령"] = _clean_string_series(df, "연령", "전체")
    feat["노출위치"] = _clean_string_series(df, "노출위치", "전체")
    feat["소재형태"] = _clean_string_series(df, "소재형태", "전체")

    # Numerical: log(예산) — 지출금액을 예산 프록시로 사용
    spend = pd.to_numeric(df.get("sum_지출금액", 0), errors="coerce").fillna(0).clip(lower=1)
    feat["log_budget"] = np.log1p(spend)

    # 기간: 날짜가 있으면 월 정보 → 기간 프록시(30일 고정), 없으면 30
    feat["기간"] = 30.0

    return feat[CAT_FEATURES + NUM_FEATURES]


def _prepare_targets(df: pd.DataFrame) -> pd.DataFrame:
    """log 변환된 타겟 반환: [log_cpm, log_ctr]"""
    cpm = _winsorize_series(
        pd.to_numeric(df["avg_cpm"], errors="coerce").fillna(0).clip(lower=1),
        0.01,
        0.99,
    ).clip(lower=1)
    cpc = _winsorize_series(
        pd.to_numeric(df["avg_cpc"], errors="coerce").fillna(0).clip(lower=1),
        0.03,
        0.97,
    ).clip(lower=1)

    # CTR ≈ CPM / (CPC × 1000)  (단위: %)
    ctr = (cpm / (cpc * 1000) * 100).clip(lower=0.001, upper=5.0)

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
            "model_type": "random_forest" | "hist_gradient_boosting" | "linear_regression",
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

    # 후보 모델 교차검증 (CV=5, R² 평균)
    cv_folds = min(5, max(2, n // 20))  # 샘플이 적으면 fold 줄임

    results = {}
    candidate_estimators: list[tuple[str, Any]] = [
        ("random_forest", RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)),
        ("linear_regression", Ridge(alpha=1.0)),
    ]
    if n >= 80:
        candidate_estimators.insert(
            1,
            (
                "hist_gradient_boosting",
                HistGradientBoostingRegressor(
                    max_iter=220,
                    max_leaf_nodes=31,
                    learning_rate=0.05,
                    l2_regularization=0.1,
                    early_stopping=True,
                    validation_fraction=0.2,
                    n_iter_no_change=15,
                    random_state=42,
                ),
            ),
        )

    for name, est in candidate_estimators:
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

    factors = compute_adjustment_factors(df)
    save_factors(factors)
    global _factors
    _factors = factors

    logger.info(f"[model] 저장 완료 → {MODEL_PATH}  R²_cpm={r2_cpm:.4f}, R²_ctr={r2_ctr:.4f}")
    return meta


# ══════════════════════════════════════════════════════════════
# 4. Adjustment factors
# ══════════════════════════════════════════════════════════════
def compute_adjustment_factors(df: pd.DataFrame) -> dict:
    """
    Derive aggregate-only CPM multipliers for dimensions that are often sparse
    in the model feature matrix. The calculation uses weighted averages and
    stores only coarse factors, not raw campaign rows.
    """
    if "avg_cpm" not in df.columns:
        return {"placement": {}, "demo": {}, "creative": {}}

    work = df.copy()
    work["avg_cpm"] = _winsorize_series(
        pd.to_numeric(work["avg_cpm"], errors="coerce").fillna(0.0),
        0.01,
        0.99,
    )
    if "sum_노출" not in work.columns:
        work["sum_노출"] = 1.0
    work["sum_노출"] = pd.to_numeric(work["sum_노출"], errors="coerce").fillna(0.0)
    work = work[work["avg_cpm"] > 0].copy()
    if work.empty:
        return {"placement": {}, "demo": {}, "creative": {}}

    overall_cpm = _safe_weighted_average(work["avg_cpm"], work["sum_노출"])
    if overall_cpm <= 0:
        return {"placement": {}, "demo": {}, "creative": {}}

    placement_factors: dict[str, float] = {}
    if "노출위치" in work.columns:
        placement_df = work.copy()
        placement_df["노출위치"] = _clean_string_series(placement_df, "노출위치", "")
        placement_df = placement_df[placement_df["노출위치"].str.strip() != ""]
        for placement, group in placement_df.groupby("노출위치"):
            cpm = _safe_weighted_average(group["avg_cpm"], group["sum_노출"])
            placement_factors[str(placement)] = round(_bounded_factor(cpm / overall_cpm), 4)

    demo_factors: dict[str, float] = {}
    if "성별" in work.columns and "연령" in work.columns:
        demo_df = work.copy()
        demo_df["성별"] = _clean_string_series(demo_df, "성별", "")
        demo_df["연령"] = _clean_string_series(demo_df, "연령", "")
        demo_df = demo_df[(demo_df["성별"].str.strip() != "") & (demo_df["연령"].str.strip() != "")]
        if not demo_df.empty:
            demo_overall = _safe_weighted_average(demo_df["avg_cpm"], demo_df["sum_노출"])
            if demo_overall > 0:
                demo_df["target_group"] = demo_df["성별"] + "_" + demo_df["연령"]
                for target_group, group in demo_df.groupby("target_group"):
                    cpm = _safe_weighted_average(group["avg_cpm"], group["sum_노출"])
                    demo_factors[str(target_group)] = round(_bounded_factor(cpm / demo_overall), 4)

    creative_factors: dict[str, float] = {}
    if "소재형태" in work.columns:
        creative_df = work.copy()
        creative_df["소재형태"] = _clean_string_series(creative_df, "소재형태", "")
        creative_df = creative_df[creative_df["소재형태"].str.strip() != ""]
        if not creative_df.empty:
            creative_overall = _safe_weighted_average(creative_df["avg_cpm"], creative_df["sum_노출"])
            if creative_overall > 0:
                for creative, group in creative_df.groupby("소재형태"):
                    cpm = _safe_weighted_average(group["avg_cpm"], group["sum_노출"])
                    creative_factors[str(creative)] = round(_bounded_factor(cpm / creative_overall), 4)

    logger.info(
        "[model] adjustment factors: placement=%s demo=%s creative=%s",
        len(placement_factors),
        len(demo_factors),
        len(creative_factors),
    )
    return {"placement": placement_factors, "demo": demo_factors, "creative": creative_factors}


def save_factors(factors: dict) -> None:
    os.makedirs(MODELS_DIR, exist_ok=True)
    with open(FACTORS_PATH, "w", encoding="utf-8") as f:
        json.dump(factors, f, ensure_ascii=False, indent=2)


def load_factors() -> dict:
    fallback = {"placement": {}, "demo": {}, "creative": {}}
    if not os.path.exists(FACTORS_PATH):
        return fallback
    try:
        with open(FACTORS_PATH, encoding="utf-8") as f:
            loaded = json.load(f)
    except Exception as exc:
        logger.warning("[model] adjustment_factors.json 로드 실패: %s", exc)
        return fallback
    return {
        "placement": loaded.get("placement", {}) if isinstance(loaded, dict) else {},
        "demo": loaded.get("demo", {}) if isinstance(loaded, dict) else {},
        "creative": loaded.get("creative", {}) if isinstance(loaded, dict) else {},
    }


def _factor_average(factors: dict[str, float], keys: list[str]) -> float:
    values = [float(factors[key]) for key in keys if key in factors]
    if not values:
        return 1.0
    return round(_bounded_factor(float(np.mean(values))), 4)


def _demo_factor(factors: dict[str, float], gender: str, age: str) -> float:
    gender = gender.strip()
    age = age.strip()
    if not gender or not age:
        return 1.0
    return _bounded_factor(float(factors.get(f"{gender}_{age}", 1.0)))


def _creative_factor(factors: dict[str, float], creative: str) -> tuple[float, bool]:
    creative = creative.strip()
    if not creative:
        return 1.0, False
    if creative in factors:
        return _bounded_factor(float(factors[creative])), False
    if creative in DEFAULT_CREATIVE_FACTORS:
        return DEFAULT_CREATIVE_FACTORS[creative], True
    return 1.0, True


# ══════════════════════════════════════════════════════════════
# 5. 모델 로드 & 예측
# ══════════════════════════════════════════════════════════════
_pipeline: Pipeline | None = None
_meta: dict = {}
_factors: dict = {"placement": {}, "demo": {}, "creative": {}}


def load_model() -> bool:
    """디스크에서 모델을 메모리에 로드. 성공 여부 반환."""
    global _pipeline, _meta, _factors
    if not os.path.exists(MODEL_PATH):
        return False
    try:
        _pipeline = joblib.load(MODEL_PATH)
        if os.path.exists(META_PATH):
            with open(META_PATH, encoding="utf-8") as f:
                _meta = json.load(f)
        _factors = load_factors()
        logger.info(
            "[model] 모델 로드 완료: %s (placement=%s demo=%s creative=%s)",
            _meta.get("model_type"),
            len(_factors["placement"]),
            len(_factors["demo"]),
            len(_factors["creative"]),
        )
        return True
    except Exception as e:
        logger.error(f"[model] 모델 로드 실패: {e}")
        return False


def predict(
    업종: str = "",
    목표: str = "",
    성별: str = "",
    연령: str = "",
    노출위치: list[str] | str = "",
    소재형태: str = "",
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

    placements = _normalize_placements(노출위치)
    primary_placement = placements[0] if placements else "전체"
    creative = 소재형태.strip() if isinstance(소재형태, str) else ""

    row = pd.DataFrame([{
        "업종":       업종 or "기타",
        "목표":       목표 or "",
        "성별":       성별 or "전체",
        "연령":       연령 or "전체",
        "노출위치":    primary_placement,
        "소재형태":    creative or "전체",
        "log_budget": np.log1p(max(예산, 1)),
        "기간":       float(기간),
    }])

    log_pred = _pipeline.predict(row)[0]  # [log_cpm, log_ctr]
    base_cpm = float(np.exp(log_pred[0]))
    ctr_pred = float(np.exp(log_pred[1]))  # %

    placement_factor = _factor_average(_factors.get("placement", {}), placements)
    demo_factor = _demo_factor(_factors.get("demo", {}), 성별 or "", 연령 or "")
    creative_factor, is_creative_fallback = _creative_factor(
        _factors.get("creative", {}),
        creative,
    )
    seasonality_multiplier, seasonality_reason = _get_seasonality()

    cpm_pred = base_cpm
    cpm_pred *= placement_factor
    cpm_pred *= demo_factor
    cpm_pred *= creative_factor
    cpm_pred *= seasonality_multiplier

    reach_est, frequency = _calc_reach(cpm_pred, DEFAULT_FREQUENCY, 예산)
    saturated_cpm = _apply_saturation(cpm_pred, frequency)
    saturation_warning = saturated_cpm > cpm_pred * 1.001
    if saturation_warning:
        cpm_pred = saturated_cpm
        reach_est, frequency = _calc_reach(cpm_pred, DEFAULT_FREQUENCY, 예산)

    # CPC 역산: CPC = CPM / (CTR/100 × 1000)
    cpc_pred = cpm_pred / (ctr_pred / 100 * 1000) if ctr_pred > 0 else 0.0

    selected_dimensions = sum([
        1 if 업종 else 0,
        1 if 목표 else 0,
        1 if 성별 or 연령 else 0,
        1 if placements else 0,
        1 if creative else 0,
    ])

    return {
        "cpm":                    int(round(cpm_pred)),
        "ctr":                    round(ctr_pred, 3),
        "cpc":                    int(round(cpc_pred)),
        "reach":                  reach_est,
        "frequency":              frequency,
        "seasonality_multiplier": round(seasonality_multiplier, 3),
        "seasonality_reason":     seasonality_reason,
        "saturation_warning":     saturation_warning,
        "is_cross_estimate":      selected_dimensions >= 2,
        "placement_factor":       round(placement_factor, 4),
        "demo_factor":            round(demo_factor, 4),
        "creative_factor":        round(creative_factor, 4),
        "is_creative_fallback":   is_creative_fallback,
        "lw_ensemble_active":     False,
        "lw_cpm":                 None,
        "lw_rf_weight":           None,
        "r2_cpm":                 _meta.get("r2_cpm", 0),
        "r2_ctr":                 _meta.get("r2_ctr", 0),
        "cv_r2":                  _meta.get("cv_r2", 0),
        "model_type":             _meta.get("model_type", "unknown"),
        "trained_at":             _meta.get("trained_at", ""),
        "n_samples":              _meta.get("n_samples", 0),
    }


def get_meta() -> dict:
    return dict(_meta)


def is_loaded() -> bool:
    return _pipeline is not None
