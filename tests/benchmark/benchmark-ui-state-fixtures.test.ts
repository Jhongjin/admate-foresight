import { describe, expect, it } from 'vitest';

import {
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from '../../lib/benchmark/uiStateFixtures.mts';
import { BENCHMARK_UI_TRUST_STATES } from '../../lib/benchmark/uiStateViewModel';

describe('benchmark UI state fixtures', () => {
  it('covers exactly the approved seven trust states', () => {
    const fixtures = buildForesightBenchmarkUiStateFixtures();
    const states = fixtures.map((fixture) => fixture.state);

    expect(states).toEqual(BENCHMARK_UI_TRUST_STATES);
    expect(new Set(states).size).toBe(BENCHMARK_UI_TRUST_STATES.length);
  });

  it('passes local synthetic fixture validation', () => {
    const fixtures = buildForesightBenchmarkUiStateFixtures();
    const validation = validateForesightBenchmarkUiStateFixtures(fixtures);

    expect(validation.expected_states).toEqual(BENCHMARK_UI_TRUST_STATES);
    expect(validation.missing_states).toEqual([]);
    expect(validation.sanitizer_failures).toEqual([]);
  });

  it('keeps every state synthetic, displayable, and blocked from unsafe outputs', () => {
    const fixtures = buildForesightBenchmarkUiStateFixtures();

    for (const fixture of fixtures) {
      expect(fixture.basis.mock_status).toBe('synthetic_local_fixture');
      expect(fixture.visible_copy.length).toBeGreaterThan(0);
      expect(fixture.redaction_expectations.length).toBeGreaterThan(0);
      expect(fixture.blocked_outputs.length).toBeGreaterThan(0);
      expect(fixture.reviewer_actions.length).toBeGreaterThan(0);
    }
  });
});
