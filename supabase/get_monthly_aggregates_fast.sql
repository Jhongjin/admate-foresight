-- Optional fast monthly aggregate path for the Foresight data plane.
-- Apply manually in the Foresight Supabase SQL Editor only after DB/admin approval.
--
-- Why:
-- - The legacy get_monthly_aggregates RPC can time out because LIMIT/OFFSET are
--   applied after a full GROUP BY over ad_data.
-- - This materialized view moves the heavy aggregate into an explicit refresh
--   step, then serves paginated reads from an indexed aggregate surface.

CREATE MATERIALIZED VIEW IF NOT EXISTS foresight_monthly_aggregates_mv AS
SELECT
  업종,
  목표,
  COALESCE(최적화목표, '') AS 최적화목표,
  COALESCE(노출위치, '') AS 노출위치,
  COALESCE(소재형태, '') AS 소재형태,
  날짜,
  AVG(cpm) AS avg_cpm,
  AVG(cpc) AS avg_cpc,
  AVG(cpc_link) AS avg_cpc_link,
  AVG(영상조회비용) AS avg_영상조회비용,
  SUM(도달) AS sum_도달,
  SUM(노출) AS sum_노출,
  SUM(지출금액) AS sum_지출금액,
  AVG(빈도) AS avg_빈도,
  SUM(영상조회수) AS sum_영상조회수
FROM ad_data
WHERE 업종 IS NOT NULL AND 업종 <> ''
  AND 목표 IS NOT NULL AND 목표 <> ''
  AND 날짜 IS NOT NULL AND 날짜 <> ''
GROUP BY 업종, 목표, COALESCE(최적화목표, ''), COALESCE(노출위치, ''), COALESCE(소재형태, ''), 날짜
WITH NO DATA;

CREATE INDEX IF NOT EXISTS foresight_monthly_aggregates_mv_order_idx
  ON foresight_monthly_aggregates_mv (업종, 날짜, 목표, 최적화목표, 노출위치, 소재형태);

CREATE OR REPLACE FUNCTION refresh_foresight_monthly_aggregates()
RETURNS VOID
LANGUAGE SQL
SECURITY INVOKER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW foresight_monthly_aggregates_mv;
$$;

CREATE OR REPLACE FUNCTION get_monthly_aggregates_fast(
  p_limit  INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  업종          TEXT,
  목표          TEXT,
  최적화목표    TEXT,
  노출위치      TEXT,
  소재형태      TEXT,
  날짜          TEXT,
  avg_cpm           NUMERIC,
  avg_cpc           NUMERIC,
  avg_cpc_link      NUMERIC,
  avg_영상조회비용  NUMERIC,
  sum_도달          NUMERIC,
  sum_노출          NUMERIC,
  sum_지출금액      NUMERIC,
  avg_빈도          NUMERIC,
  sum_영상조회수    NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    업종,
    목표,
    최적화목표,
    노출위치,
    소재형태,
    날짜,
    avg_cpm,
    avg_cpc,
    avg_cpc_link,
    avg_영상조회비용,
    sum_도달,
    sum_노출,
    sum_지출금액,
    avg_빈도,
    sum_영상조회수
  FROM foresight_monthly_aggregates_mv
  ORDER BY 업종, 날짜, 목표, 최적화목표, 노출위치, 소재형태
  LIMIT GREATEST(0, LEAST(p_limit, 5000))
  OFFSET GREATEST(0, p_offset);
$$;

-- Run after creation and after each approved Meta/backfill batch:
-- SELECT refresh_foresight_monthly_aggregates();
