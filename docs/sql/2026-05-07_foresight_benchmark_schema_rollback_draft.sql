-- AdMate Foresight benchmark schema rollback draft
-- Gate: Foresight-Benchmark-11 schema draft SQL preparation
-- Date: 2026-05-07
--
-- REVIEW ONLY. DO NOT EXECUTE.
--
-- This rollback draft is not approved for production use. Before any rollback
-- rehearsal, operators must confirm row counts, backup/export availability,
-- affected dataset versions, audit ownership, and RLS policy impact.
--
-- Reverse dependency order for proposed tables:

DROP TABLE IF EXISTS foresight.normalized_benchmark_rows;
DROP TABLE IF EXISTS foresight.benchmark_review_events;
DROP TABLE IF EXISTS foresight.benchmark_dry_run_reports;
DROP TABLE IF EXISTS foresight.benchmark_dataset_versions;
DROP TABLE IF EXISTS foresight.benchmark_uploads;

-- The proposal namespace is intentionally left in place.
-- Schema namespace handling must follow the AdMate Data Core decision.
