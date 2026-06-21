-- Optional seasonality RPC for large demographic fallback datasets.
-- Apply manually in Supabase SQL Editor only after DB/admin approval.
--
-- Purpose:
-- - Keep the existing monthly/placement seasonality path unchanged.
-- - Provide a date-bounded demographic fallback source so seasonality reads
--   do not need to load the full get_demographic_fallback result set.

CREATE OR REPLACE FUNCTION get_demographic_fallback_season(
  p_since  TEXT,
  p_until  TEXT,
  p_limit  INT DEFAULT 5000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  업종           TEXT,
  날짜           TEXT,
  sum_노출        NUMERIC,
  sum_지출금액    NUMERIC,
  sum_clicks      NUMERIC,
  sum_영상조회수  NUMERIC,
  sum_도달        NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    업종,
    날짜,
    SUM(노출) AS sum_노출,
    SUM(지출금액) AS sum_지출금액,
    SUM(CASE WHEN COALESCE(cpc, 0) > 0 THEN 지출금액 / cpc ELSE 0 END) AS sum_clicks,
    SUM(영상조회수) AS sum_영상조회수,
    SUM(도달) AS sum_도달
  FROM ad_data
  WHERE breakdown_type = 'demographic'
    AND 업종 IS NOT NULL AND 업종 <> ''
    AND 날짜 IS NOT NULL AND 날짜 <> ''
    AND 날짜 >= p_since
    AND 날짜 <= p_until
  GROUP BY 업종, 날짜
  ORDER BY 업종, 날짜
  LIMIT GREATEST(0, LEAST(p_limit, 5000))
  OFFSET GREATEST(0, p_offset);
$$;
