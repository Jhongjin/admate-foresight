import { runBenchmarkDryRunMockCases } from '../lib/benchmark/dryRunHarness.mts';

const result = runBenchmarkDryRunMockCases();

const payload = {
  harness: 'AdMate Foresight Benchmark Dry-run Harness v1',
  mode: 'local_inline_mock_only',
  side_effects: {
    db_write: false,
    meta_api_call: false,
    llm_call: false,
    python_retrain: false,
    raw_file_created: false,
  },
  summary: result.summary,
  expectation_failures: result.expectation_failures,
  reports: result.reports,
};

console.log(JSON.stringify(payload, null, 2));

if (result.expectation_failures.length > 0) {
  process.exitCode = 1;
}
