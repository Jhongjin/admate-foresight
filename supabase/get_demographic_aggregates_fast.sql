-- Optional fast demographic aggregate cache for the Foresight data plane.
-- Apply manually in the Foresight Supabase SQL Editor only after DB/admin approval.
--
-- This avoids timing out on the legacy get_demographic_aggregates GROUP BY over
-- all ad_data rows. Refresh small date windows, then read the compact cache.

CREATE INDEX IF NOT EXISTS ad_data_foresight_demo_window_idx
  ON ad_data (U&"\B0A0\C9DC", U&"\C5C5\C885", U&"\BAA9\D45C", U&"\C131\BCC4", U&"\C5F0\B839");

CREATE TABLE IF NOT EXISTS foresight_demographic_aggregates_cache (
  window_start       TEXT NOT NULL,
  window_end         TEXT NOT NULL,
  industry           TEXT NOT NULL,
  objective          TEXT NOT NULL,
  optimization_goal  TEXT NOT NULL DEFAULT '',
  gender             TEXT NOT NULL,
  age_range          TEXT NOT NULL,
  cpm_sum            NUMERIC NOT NULL DEFAULT 0,
  cpm_count          BIGINT NOT NULL DEFAULT 0,
  cpc_sum            NUMERIC NOT NULL DEFAULT 0,
  cpc_count          BIGINT NOT NULL DEFAULT 0,
  sum_reach          NUMERIC,
  sum_impressions    NUMERIC,
  sum_spend          NUMERIC,
  sum_video_views    NUMERIC,
  refreshed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (window_start, window_end, industry, objective, optimization_goal, gender, age_range)
);

CREATE INDEX IF NOT EXISTS foresight_demographic_aggregates_cache_order_idx
  ON foresight_demographic_aggregates_cache (industry, objective, optimization_goal, gender, age_range);

CREATE OR REPLACE FUNCTION refresh_foresight_demographic_aggregates_window(
  p_start_date TEXT,
  p_end_date   TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL OR p_start_date >= p_end_date THEN
    RAISE EXCEPTION 'Expected a non-empty [start, end) date window, got % to %', p_start_date, p_end_date;
  END IF;

  DELETE FROM foresight_demographic_aggregates_cache
  WHERE window_start = p_start_date
    AND window_end = p_end_date;

  INSERT INTO foresight_demographic_aggregates_cache (
    window_start,
    window_end,
    industry,
    objective,
    optimization_goal,
    gender,
    age_range,
    cpm_sum,
    cpm_count,
    cpc_sum,
    cpc_count,
    sum_reach,
    sum_impressions,
    sum_spend,
    sum_video_views,
    refreshed_at
  )
  SELECT
    p_start_date AS window_start,
    p_end_date AS window_end,
    U&"\C5C5\C885"::TEXT AS industry,
    U&"\BAA9\D45C"::TEXT AS objective,
    COALESCE(U&"\CD5C\C801\D654\BAA9\D45C"::TEXT, '') AS optimization_goal,
    U&"\C131\BCC4"::TEXT AS gender,
    U&"\C5F0\B839"::TEXT AS age_range,
    COALESCE(SUM(cpm) FILTER (WHERE cpm IS NOT NULL), 0) AS cpm_sum,
    COUNT(cpm) AS cpm_count,
    COALESCE(SUM(cpc) FILTER (WHERE cpc IS NOT NULL), 0) AS cpc_sum,
    COUNT(cpc) AS cpc_count,
    SUM(U&"\B3C4\B2EC") AS sum_reach,
    SUM(U&"\B178\CD9C") AS sum_impressions,
    SUM(U&"\C9C0\CD9C\AE08\C561") AS sum_spend,
    SUM(U&"\C601\C0C1\C870\D68C\C218") AS sum_video_views,
    NOW() AS refreshed_at
  FROM ad_data
  WHERE U&"\B0A0\C9DC" >= p_start_date
    AND U&"\B0A0\C9DC" < p_end_date
    AND U&"\C5C5\C885" IS NOT NULL
    AND U&"\C5C5\C885" <> ''
    AND U&"\BAA9\D45C" IS NOT NULL
    AND U&"\BAA9\D45C" <> ''
    AND U&"\C131\BCC4" IS NOT NULL
    AND U&"\C131\BCC4" <> ''
    AND U&"\C5F0\B839" IS NOT NULL
    AND U&"\C5F0\B839" <> ''
  GROUP BY
    U&"\C5C5\C885",
    U&"\BAA9\D45C",
    COALESCE(U&"\CD5C\C801\D654\BAA9\D45C"::TEXT, ''),
    U&"\C131\BCC4",
    U&"\C5F0\B839";

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION get_demographic_aggregates_fast(
  p_limit  INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  industry           TEXT,
  objective          TEXT,
  optimization_goal  TEXT,
  gender             TEXT,
  age_range          TEXT,
  avg_cpm            NUMERIC,
  avg_cpc            NUMERIC,
  sum_reach          NUMERIC,
  sum_impressions    NUMERIC,
  sum_spend          NUMERIC,
  sum_video_views    NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    industry,
    objective,
    optimization_goal,
    gender,
    age_range,
    COALESCE(SUM(cpm_sum) / NULLIF(SUM(cpm_count), 0), 0) AS avg_cpm,
    COALESCE(SUM(cpc_sum) / NULLIF(SUM(cpc_count), 0), 0) AS avg_cpc,
    SUM(sum_reach) AS sum_reach,
    SUM(sum_impressions) AS sum_impressions,
    SUM(sum_spend) AS sum_spend,
    SUM(sum_video_views) AS sum_video_views
  FROM foresight_demographic_aggregates_cache
  GROUP BY industry, objective, optimization_goal, gender, age_range
  ORDER BY industry, objective, optimization_goal, gender, age_range
  LIMIT GREATEST(0, LEAST(p_limit, 1000))
  OFFSET GREATEST(0, p_offset);
$$;

CREATE OR REPLACE FUNCTION get_demographic_aggregates_fast_count()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM (
    SELECT 1
    FROM foresight_demographic_aggregates_cache
    GROUP BY industry, objective, optimization_goal, gender, age_range
  ) grouped;
$$;

REVOKE ALL ON FUNCTION refresh_foresight_demographic_aggregates_window(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_demographic_aggregates_fast(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_demographic_aggregates_fast_count() TO anon, authenticated;

-- Run small windows after creation, for example:
-- SELECT refresh_foresight_demographic_aggregates_window('2026-03-01', '2026-04-01');
