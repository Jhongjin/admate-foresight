-- Optional fast monthly aggregate path for the Foresight data plane.
-- Apply manually in the Foresight Supabase SQL Editor only after DB/admin approval.
--
-- Why:
-- - The legacy get_monthly_aggregates RPC can time out because LIMIT/OFFSET are
--   applied after a full GROUP BY over ad_data.
-- - This materialized view moves the heavy aggregate into an explicit refresh
--   step, then serves paginated reads from an indexed aggregate surface.

CREATE MATERIALIZED VIEW IF NOT EXISTS foresight_monthly_aggregates_mv AS
WITH normalized AS (
  SELECT
    row_data ->> U&'\C5C5\C885' AS industry,
    row_data ->> U&'\BAA9\D45C' AS objective,
    row_data ->> U&'\CD5C\C801\D654\BAA9\D45C' AS optimization_goal,
    row_data ->> U&'\B178\CD9C\C704\CE58' AS placement,
    row_data ->> U&'\C18C\C7AC\D615\D0DC' AS creative_format,
    row_data ->> U&'\B0A0\C9DC' AS metric_date,
    NULLIF(row_data ->> 'cpm', '')::numeric AS cpm,
    NULLIF(row_data ->> 'cpc', '')::numeric AS cpc,
    NULLIF(row_data ->> 'cpc_link', '')::numeric AS cpc_link,
    NULLIF(row_data ->> U&'\C601\C0C1\C870\D68C\BE44\C6A9', '')::numeric AS video_view_cost,
    NULLIF(row_data ->> U&'\B3C4\B2EC', '')::numeric AS reach,
    NULLIF(row_data ->> U&'\B178\CD9C', '')::numeric AS impressions,
    NULLIF(row_data ->> U&'\C9C0\CD9C\AE08\C561', '')::numeric AS spend,
    NULLIF(row_data ->> U&'\BE48\B3C4', '')::numeric AS frequency,
    NULLIF(row_data ->> U&'\C601\C0C1\C870\D68C\C218', '')::numeric AS video_views
  FROM (
    SELECT to_jsonb(d) AS row_data
    FROM ad_data AS d
  ) source
)
SELECT
  industry,
  objective,
  COALESCE(optimization_goal, '') AS optimization_goal,
  COALESCE(placement, '') AS placement,
  COALESCE(creative_format, '') AS creative_format,
  metric_date,
  AVG(cpm) AS avg_cpm,
  AVG(cpc) AS avg_cpc,
  AVG(cpc_link) AS avg_cpc_link,
  AVG(video_view_cost) AS avg_video_view_cost,
  SUM(reach) AS sum_reach,
  SUM(impressions) AS sum_impressions,
  SUM(spend) AS sum_spend,
  AVG(frequency) AS avg_frequency,
  SUM(video_views) AS sum_video_views
FROM normalized
WHERE industry IS NOT NULL AND industry <> ''
  AND objective IS NOT NULL AND objective <> ''
  AND metric_date IS NOT NULL AND metric_date <> ''
GROUP BY industry, objective, COALESCE(optimization_goal, ''), COALESCE(placement, ''), COALESCE(creative_format, ''), metric_date
WITH NO DATA;

CREATE INDEX IF NOT EXISTS foresight_monthly_aggregates_mv_order_idx
  ON foresight_monthly_aggregates_mv (industry, metric_date, objective, optimization_goal, placement, creative_format);

CREATE OR REPLACE FUNCTION refresh_foresight_monthly_aggregates()
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW foresight_monthly_aggregates_mv;
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
SECURITY INVOKER
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
  FROM foresight_monthly_aggregates_mv
  ORDER BY industry, metric_date, objective, optimization_goal, placement, creative_format
  LIMIT GREATEST(0, LEAST(p_limit, 5000))
  OFFSET GREATEST(0, p_offset);
$$;

-- Run after creation and after each approved Meta/backfill batch:
-- SELECT refresh_foresight_monthly_aggregates();
