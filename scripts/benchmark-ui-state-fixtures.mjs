import {
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from '../lib/benchmark/uiStateFixtures.mts';

const fixtures = buildForesightBenchmarkUiStateFixtures();
const validation = validateForesightBenchmarkUiStateFixtures(fixtures);

const payload = {
  fixture_pack: 'AdMate Foresight Benchmark Local UI State Fixtures v1',
  mode: 'local_synthetic_ui_state_only',
  side_effects: {
    db_write: false,
    benchmark_import: false,
    benchmark_upload: false,
    meta_api_call: false,
    llm_call: false,
    python_retrain: false,
    raw_file_created: false,
    production_call: false,
  },
  summary: fixtures.map((fixture) => ({
    state: fixture.state,
    source_case: fixture.source_case,
    status_label: fixture.status_label,
    primary_surface: fixture.primary_surface,
    mock_status: fixture.basis.mock_status,
    reviewer_actions: fixture.reviewer_actions,
    blocked_outputs: fixture.blocked_outputs,
  })),
  validation,
};

console.log(JSON.stringify(payload, null, 2));

if (validation.missing_states.length > 0 || validation.sanitizer_failures.length > 0) {
  process.exitCode = 1;
}
