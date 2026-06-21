"""
data_loader.py
Supabase ad_data 테이블에서 학습용 원시 데이터를 불러옵니다.
RPC 집계 함수(get_monthly_aggregates)를 페이지 단위로 호출해
pandas DataFrame으로 반환합니다.
"""

from __future__ import annotations

import os
import logging
import pandas as pd
from supabase import create_client, Client

logger = logging.getLogger(__name__)


def _has_dedicated_foresight_env() -> bool:
    return any(
        os.environ.get(name)
        for name in (
            "FORESIGHT_SUPABASE_URL",
            "NEXT_PUBLIC_FORESIGHT_SUPABASE_URL",
            "FORESIGHT_SUPABASE_ANON_KEY",
            "NEXT_PUBLIC_FORESIGHT_SUPABASE_ANON_KEY",
        )
    )


# ── Supabase 클라이언트 (모듈 로드 시 1회 초기화) ──────────────
def _get_client() -> Client:
    if _has_dedicated_foresight_env():
        url = (
            os.environ.get("FORESIGHT_SUPABASE_URL")
            or os.environ.get("NEXT_PUBLIC_FORESIGHT_SUPABASE_URL", "")
        )
        key = (
            os.environ.get("FORESIGHT_SUPABASE_ANON_KEY")
            or os.environ.get("NEXT_PUBLIC_FORESIGHT_SUPABASE_ANON_KEY", "")
        )
    else:
        url = (
            os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
            or os.environ.get("SUPABASE_URL", "")
        )
        key = (
            os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
            or os.environ.get("SUPABASE_KEY", "")
        )
    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL / SUPABASE_KEY 환경변수가 설정되지 않았습니다."
        )
    return create_client(url, key)


# ── 페이지 단위 RPC 호출 ───────────────────────────────────────
def _fetch_rpc_all_pages(client: Client, fn_name: str, page: int = 1000) -> list[dict]:
    all_rows: list[dict] = []
    offset = 0

    while True:
        result = client.rpc(fn_name, {"p_limit": page, "p_offset": offset}).execute()
        rows: list[dict] = result.data or []
        all_rows.extend(rows)
        logger.info(f"[data_loader] {fn_name}: {len(all_rows)}행 로딩 중...")
        if len(rows) < page:
            break
        offset += page

    logger.info(f"[data_loader] {fn_name}: 총 {len(all_rows)}행 완료")
    return all_rows


def _is_missing_rpc_error(error: Exception) -> bool:
    message = str(error)
    return (
        "PGRST202" in message
        or "Could not find the function" in message
        or "function" in message.lower() and "does not exist" in message.lower()
    )


def _fetch_rpc_all_pages_any(client: Client, fn_names: tuple[str, ...], page: int = 1000) -> list[dict]:
    missing_error: Exception | None = None
    for fn_name in fn_names:
        try:
            return _fetch_rpc_all_pages(client, fn_name, page=page)
        except Exception as exc:
            if _is_missing_rpc_error(exc) and len(fn_names) > 1:
                missing_error = exc
                continue
            raise
    if missing_error:
        raise missing_error
    raise RuntimeError(f"RPC 후보를 실행하지 못했습니다: {', '.join(fn_names)}")


# ── 월별 집계 데이터 (주 학습 소스) ──────────────────────────
def load_monthly_data() -> pd.DataFrame:
    """
    get_monthly_aggregates RPC → DataFrame 반환.

    컬럼:
        업종, 목표, 최적화목표, 노출위치, 소재형태, 날짜
        avg_cpm, avg_cpc, avg_cpc_link, avg_영상조회비용
        sum_도달, sum_노출, sum_지출금액, avg_빈도, sum_영상조회수
    """
    client = _get_client()
    rows = _fetch_rpc_all_pages_any(
        client,
        ("get_monthly_aggregates_fast", "get_monthly_aggregates"),
    )
    if not rows:
        raise RuntimeError("Supabase에서 월별 데이터를 불러오지 못했습니다.")

    df = pd.DataFrame(rows)

    # 숫자 컬럼 타입 보정
    num_cols = [
        "avg_cpm", "avg_cpc", "avg_cpc_link", "avg_영상조회비용",
        "sum_도달", "sum_노출", "sum_지출금액", "avg_빈도", "sum_영상조회수",
    ]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    # 날짜 → datetime
    if "날짜" in df.columns:
        df["날짜"] = pd.to_datetime(df["날짜"], errors="coerce")

    # CPM/CPC 이상값 제거 (0 이하)
    df = df[(df["avg_cpm"] > 0) & (df["avg_cpc"] > 0)].copy()

    logger.info(f"[data_loader] 전처리 후 {len(df)}행")
    return df


# ── 성별/연령 세분화 데이터 (보조) ───────────────────────────
def load_demo_data() -> pd.DataFrame:
    """
    get_demographic_aggregates RPC → DataFrame 반환.

    컬럼: 업종, 목표, 최적화목표, 성별, 연령
          avg_cpm, avg_cpc, sum_도달, sum_노출, sum_지출금액, sum_영상조회수
    """
    client = _get_client()
    rows = _fetch_rpc_all_pages(client, "get_demographic_aggregates")
    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    num_cols = ["avg_cpm", "avg_cpc", "sum_도달", "sum_노출", "sum_지출금액", "sum_영상조회수"]
    for c in num_cols:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0.0)

    df = df[(df["avg_cpm"] > 0)].copy()
    return df
