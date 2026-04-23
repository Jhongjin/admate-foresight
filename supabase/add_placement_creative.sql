-- ============================================================
-- 0. 기존 함수 DROP (반환 타입 변경 시 필수)
-- ============================================================
DROP FUNCTION IF EXISTS get_monthly_aggregates(integer, integer);
DROP FUNCTION IF EXISTS get_monthly_aggregates_count();
DROP FUNCTION IF EXISTS get_demographic_aggregates(integer, integer);
DROP FUNCTION IF EXISTS get_demographic_aggregates_count();

-- ============================================================
-- 1. ad_data 테이블에 컬럼 추가
--    (최적화목표는 이미 존재 → 스킵)
-- ============================================================
ALTER TABLE ad_data
  ADD COLUMN IF NOT EXISTS 노출위치 TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS 소재형태 TEXT NOT NULL DEFAULT '';

-- ============================================================
-- 2. get_monthly_aggregates
--    최적화목표 · 노출위치 · 소재형태를 GROUP BY에 추가
-- ============================================================
CREATE OR REPLACE FUNCTION get_monthly_aggregates(
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
LANGUAGE SQL STABLE AS $$
  SELECT
    업종,
    목표,
    COALESCE(최적화목표, '')  AS 최적화목표,
    COALESCE(노출위치,   '')  AS 노출위치,
    COALESCE(소재형태,   '')  AS 소재형태,
    날짜,
    AVG(cpm)          AS avg_cpm,
    AVG(cpc)          AS avg_cpc,
    AVG(cpc_link)     AS avg_cpc_link,
    AVG(영상조회비용)  AS avg_영상조회비용,
    SUM(도달)         AS sum_도달,
    SUM(노출)         AS sum_노출,
    SUM(지출금액)     AS sum_지출금액,
    AVG(빈도)         AS avg_빈도,
    SUM(영상조회수)   AS sum_영상조회수
  FROM ad_data
  WHERE 업종  IS NOT NULL AND 업종  <> ''
    AND 목표  IS NOT NULL AND 목표  <> ''
    AND 날짜  IS NOT NULL AND 날짜  <> ''
  GROUP BY 업종, 목표, 최적화목표, 노출위치, 소재형태, 날짜
  ORDER BY 업종, 날짜
  LIMIT p_limit OFFSET p_offset;
$$;

-- ============================================================
-- 3. get_monthly_aggregates_count (페이지네이션용)
-- ============================================================
CREATE OR REPLACE FUNCTION get_monthly_aggregates_count()
RETURNS BIGINT
LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FROM (
    SELECT 1
    FROM ad_data
    WHERE 업종 IS NOT NULL AND 업종 <> ''
      AND 목표 IS NOT NULL AND 목표 <> ''
      AND 날짜 IS NOT NULL AND 날짜 <> ''
    GROUP BY 업종, 목표, 최적화목표, 노출위치, 소재형태, 날짜
  ) t;
$$;

-- ============================================================
-- 4. get_demographic_aggregates
--    최적화목표 추가 (노출위치·소재형태는 성별/연령과 교차 시
--    데이터가 과도하게 늘어나므로 제외)
-- ============================================================
CREATE OR REPLACE FUNCTION get_demographic_aggregates(
  p_limit  INT DEFAULT 1000,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  업종        TEXT,
  목표        TEXT,
  최적화목표  TEXT,
  성별        TEXT,
  연령        TEXT,
  avg_cpm       NUMERIC,
  avg_cpc       NUMERIC,
  sum_도달      NUMERIC,
  sum_노출      NUMERIC,
  sum_지출금액  NUMERIC,
  sum_영상조회수 NUMERIC
)
LANGUAGE SQL STABLE AS $$
  SELECT
    업종,
    목표,
    COALESCE(최적화목표, '') AS 최적화목표,
    성별,
    연령,
    AVG(cpm)        AS avg_cpm,
    AVG(cpc)        AS avg_cpc,
    SUM(도달)       AS sum_도달,
    SUM(노출)       AS sum_노출,
    SUM(지출금액)   AS sum_지출금액,
    SUM(영상조회수) AS sum_영상조회수
  FROM ad_data
  WHERE 업종  IS NOT NULL AND 업종  <> ''
    AND 목표  IS NOT NULL AND 목표  <> ''
    AND 성별  IS NOT NULL AND 성별  <> ''
    AND 연령  IS NOT NULL AND 연령  <> ''
  GROUP BY 업종, 목표, 최적화목표, 성별, 연령
  ORDER BY 업종
  LIMIT p_limit OFFSET p_offset;
$$;

-- ============================================================
-- 5. get_demographic_aggregates_count (페이지네이션용)
-- ============================================================
CREATE OR REPLACE FUNCTION get_demographic_aggregates_count()
RETURNS BIGINT
LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*) FROM (
    SELECT 1
    FROM ad_data
    WHERE 업종 IS NOT NULL AND 업종 <> ''
      AND 목표 IS NOT NULL AND 목표 <> ''
      AND 성별 IS NOT NULL AND 성별 <> ''
      AND 연령 IS NOT NULL AND 연령 <> ''
    GROUP BY 업종, 목표, 최적화목표, 성별, 연령
  ) t;
$$;
