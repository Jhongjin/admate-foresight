import { describe, expect, it } from 'vitest';

import {
  type BenchmarkUiStateFixture,
  buildForesightBenchmarkUiStateFixtures,
  validateForesightBenchmarkUiStateFixtures,
} from '../../lib/benchmark/uiStateFixtures.mts';
import { BENCHMARK_UI_TRUST_STATES } from '../../lib/benchmark/uiStateViewModel';

const FORBIDDEN_USER_FACING_COPY = /confidence|신뢰도|확신|확정|보장|promise|certainty/i;

function collectUserFacingFixtureCopy(fixture: BenchmarkUiStateFixture): string[] {
  return [
    fixture.status_label,
    fixture.metric?.label,
    fixture.metric?.value_label,
    fixture.metric?.confidence_label,
    fixture.metric?.basis_label,
    fixture.basis.platform,
    fixture.basis.objective,
    fixture.basis.metric,
    fixture.basis.date_window,
    fixture.basis.recent_data_policy,
    fixture.basis.sample_or_coverage,
    fixture.basis.currency_basis,
    ...fixture.visible_copy,
    ...fixture.redaction_expectations,
    ...fixture.blocked_outputs,
  ].filter((value): value is string => typeof value === 'string');
}

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

  it('keeps user-facing fixture copy on evidence and operator-review language', () => {
    const fixtures = buildForesightBenchmarkUiStateFixtures();

    for (const fixture of fixtures) {
      const userFacingCopy = collectUserFacingFixtureCopy(fixture).join(' ');

      expect(userFacingCopy).not.toMatch(FORBIDDEN_USER_FACING_COPY);
    }
  });
});
