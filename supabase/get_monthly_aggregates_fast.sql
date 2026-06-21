-- Optional fast monthly aggregate cache for the Foresight data plane.
-- Apply manually in the Foresight Supabase SQL Editor only after DB/admin approval.
--
-- Why:
-- - A full materialized-view refresh can exceed the Supabase SQL Editor timeout.
-- - This cache can be filled in date windows, usually one month at a time.
-- - Korean source column names are referenced with PostgreSQL Unicode escapes so
--   the SQL remains safe to paste through environments that corrupt non-ASCII text.

CREATE INDEX IF NOT EXISTS ad_data_foresight_metric_date_idx
  ON ad_data (U&"\B0A0\C9DC");

CREATE TABLE IF NOT EXISTS foresight_monthly_aggregates_cache (
  industry             TEXT NOT NULL,
  objective            TEXT NOT NULL,
  optimization_goal    TEXT NOT NULL DEFAULT '',
  placement            TEXT NOT NULL DEFAULT '',
  creative_format      TEXT NOT NULL DEFAULT '',
  metric_date          TEXT NOT NULL,
  avg_cpm              NUMERIC,
  avg_cpc              NUMERIC,
  avg_cpc_link         NUMERIC,
  avg_video_view_cost  NUMERIC,
  sum_reach            NUMERIC,
  sum_impressions      NUMERIC,
  sum_spend            NUMERIC,
  avg_frequency        NUMERIC,
  sum_video_views      NUMERIC,
  refreshed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (industry, objective, optimization_goal, placement, creative_format, metric_date)
);

CREATE INDEX IF NOT EXISTS foresight_monthly_aggregates_cache_order_idx
  ON foresight_monthly_aggregates_cache (industry, metric_date, objective, optimization_goal, placement, creative_format);

CREATE OR REPLACE FUNCTION refresh_foresight_monthly_aggregates_window(
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

  DELETE FROM foresight_monthly_aggregates_cache
  WHERE metric_date >= p_start_date
    AND metric_date < p_end_date;

  INSERT INTO foresight_monthly_aggregates_cache (
    industry,
    objective,
    optimization_goal,
    placement,
    creative_format,
    metric_date,
    avg_cpm,
    avg_cpc,
    avg_cpc_link,
    avg_video_view_cost,
    sum_reach,
    sum_impressions,
    sum_spend,
    avg_frequency,
    sum_video_views,
    refreshed_at
  )
  SELECT
    U&"\C5C5\C885"::TEXT AS industry,
    U&"\BAA9\D45C"::TEXT AS objective,
    COALESCE(U&"\CD5C\C801\D654\BAA9\D45C"::TEXT, '') AS optimization_goal,
    COALESCE(U&"\B178\CD9C\C704\CE58"::TEXT, '') AS placement,
    COALESCE(U&"\C18C\C7AC\D615\D0DC"::TEXT, '') AS creative_format,
    U&"\B0A0\C9DC"::TEXT AS metric_date,
    AVG(cpm) AS avg_cpm,
    AVG(cpc) AS avg_cpc,
    AVG(cpc_link) AS avg_cpc_link,
    AVG(U&"\C601\C0C1\C870\D68C\BE44\C6A9") AS avg_video_view_cost,
    SUM(U&"\B3C4\B2EC") AS sum_reach,
    SUM(U&"\B178\CD9C") AS sum_impressions,
    SUM(U&"\C9C0\CD9C\AE08\C561") AS sum_spend,
    AVG(U&"\BE48\B3C4") AS avg_frequency,
    SUM(U&"\C601\C0C1\C870\D68C\C218") AS sum_video_views,
    NOW() AS refreshed_at
  FROM ad_data
  WHERE U&"\B0A0\C9DC" >= p_start_date
    AND U&"\B0A0\C9DC" < p_end_date
    AND U&"\C5C5\C885" IS NOT NULL
    AND U&"\C5C5\C885" <> ''
    AND U&"\BAA9\D45C" IS NOT NULL
    AND U&"\BAA9\D45C" <> ''
    AND U&"\B0A0\C9DC" IS NOT NULL
    AND U&"\B0A0\C9DC" <> ''
  GROUP BY
    U&"\C5C5\C885",
    U&"\BAA9\D45C",
    COALESCE(U&"\CD5C\C801\D654\BAA9\D45C"::TEXT, ''),
    COALESCE(U&"\B178\CD9C\C704\CE58"::TEXT, ''),
    COALESCE(U&"\C18C\C7AC\D615\D0DC"::TEXT, ''),
    U&"\B0A0\C9DC";

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION refresh_foresight_monthly_aggregates()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Use refresh_foresight_monthly_aggregates_window(start_date, end_date) with a small date window.';
END;
$$;

CREATE OR REPLACE FUNCTION get_monthly_aggregates_fast(
  p_limit  INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  industry             TEXT,
  objective            TEXT,
  optimization_goal    TEXT,
  placement            TEXT,
  creative_format      TEXT,
  metric_date          TEXT,
  avg_cpm              NUMERIC,
  avg_cpc              NUMERIC,
  avg_cpc_link         NUMERIC,
  avg_video_view_cost  NUMERIC,
  sum_reach            NUMERIC,
  sum_impressions      NUMERIC,
  sum_spend            NUMERIC,
  avg_frequency        NUMERIC,
  sum_video_views      NUMERIC
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
    placement,
    creative_format,
    metric_date,
    avg_cpm,
    avg_cpc,
    avg_cpc_link,
    avg_video_view_cost,
    sum_reach,
    sum_impressions,
    sum_spend,
    avg_frequency,
    sum_video_views
  FROM foresight_monthly_aggregates_cache
  ORDER BY industry, metric_date, objective, optimization_goal, placement, creative_format
  LIMIT GREATEST(0, LEAST(p_limit, 5000))
  OFFSET GREATEST(0, p_offset);
$$;

CREATE OR REPLACE FUNCTION get_monthly_aggregates_fast_count()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM foresight_monthly_aggregates_cache;
$$;

REVOKE ALL ON FUNCTION refresh_foresight_monthly_aggregates_window(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION refresh_foresight_monthly_aggregates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_aggregates_fast(INT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_aggregates_fast_count() TO anon, authenticated;

-- Run small windows after creation, for example:
-- SELECT refresh_foresight_monthly_aggregates_window('2026-03-01', '2026-04-01');
