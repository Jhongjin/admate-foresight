import '@testing-library/jest-dom/vitest';

import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildForesightBenchmarkUiStateFixtures,
  type BenchmarkTrustState,
} from '../../lib/benchmark/uiStateFixtures.mts';
import { buildBenchmarkUiStateViewModel } from '../../lib/benchmark/uiStateViewModel';
import KPICard from '../../components/KPICard';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const REQUIRED_RENDER_CONCEPTS: Record<BenchmarkTrustState, RegExp[]> = {
  'benchmark-ready': [
    /synthetic benchmark cpm/i,
    /ready for reviewer approval/i,
    /high confidence/i,
    /recent six-month benchmark window/i,
    /synthetic local fixture only/i,
    /benchmark import/i,
    /db promotion/i,
  ],
  'low-confidence': [
    /low confidence/i,
    /low sample coverage/i,
    /before report\/export action/i,
    /overclaiming forecast copy/i,
  ],
  'long-term-trend-only': [
    /long-term trend reference only/i,
    /older than recent six-month benchmark window/i,
    /excluded from default benchmark/i,
    /recent benchmark and trend-only data are separated/i,
  ],
  'validation-error': [
    /validation error/i,
    /missing required field: spend/i,
    /storage/i,
    /model use/i,
    /report-ready output/i,
  ],
  'security-review-required': [
    /security review required/i,
    /before promotion/i,
    /normalized preview/i,
    /report export/i,
    /llm prompt payload/i,
  ],
  'raw-identifier-risk': [
    /raw identifier risk/i,
    /aggregate-only/i,
    /raw identifiers were excluded/i,
    /raw identifier display/i,
    /llm prompt payload with identifiers/i,
  ],
  'no-benchmark-data': [
    /no usable benchmark data/i,
    /no usable aggregate benchmark exists/i,
    /0 synthetic aggregate rows/i,
    /forecast fabrication/i,
    /empty source shell shown as evidence/i,
  ],
};

function BenchmarkStateProbe({
  fixture,
}: {
  fixture: ReturnType<typeof buildForesightBenchmarkUiStateFixtures>[number];
}) {
  const viewModel = buildBenchmarkUiStateViewModel(fixture);

  return (
    <article aria-label={viewModel.state}>
      <KPICard
        title={viewModel.metricLabel}
        value={viewModel.metricValue}
        icon="📊"
        benchmarkStatusLabel={viewModel.statusLabel}
        benchmarkBasisLines={viewModel.basisLines}
        benchmarkConfidenceLabel={viewModel.confidenceLabel}
        benchmarkVisibleCopy={[
          ...viewModel.visibleCopy,
          ...viewModel.redactionExpectations,
        ]}
        benchmarkSyntheticContextLabel={viewModel.syntheticContextLabel}
        benchmarkBlockedOutputs={viewModel.blockedOutputs}
      />
    </article>
  );
}

afterEach(() => {
  cleanup();
});

describe('benchmark UI state rendering adapter', () => {
  it.each(buildForesightBenchmarkUiStateFixtures())(
    'renders required concepts for %s',
    (fixture) => {
      render(<BenchmarkStateProbe fixture={fixture} />);

      const article = screen.getByRole('article', { name: fixture.state });
      const renderedText = article.textContent ?? '';

      for (const concept of REQUIRED_RENDER_CONCEPTS[fixture.state]) {
        expect(renderedText).toMatch(concept);
      }

      expect(renderedText).not.toMatch(/report ready:\s*true/i);
      expect(renderedText).not.toMatch(/promotion ready:\s*true/i);
    },
  );

  it.each(buildForesightBenchmarkUiStateFixtures())(
    'exposes benchmark trust semantics for %s',
    (fixture) => {
      const viewModel = buildBenchmarkUiStateViewModel(fixture);

      render(<BenchmarkStateProbe fixture={fixture} />);

      const article = screen.getByRole('article', { name: fixture.state });
      const card = within(article).getByRole('region', {
        name: new RegExp(`${escapeRegExp(viewModel.metricLabel)} benchmark trust details`, 'i'),
      });

      expect(within(card).getByRole('status')).toHaveAccessibleName(
        `Benchmark status: ${viewModel.statusLabel}`,
      );

      const basis = card.querySelector('dl');
      expect(basis).not.toBeNull();
      expect(basis).toHaveAccessibleName(
        `${viewModel.metricLabel} benchmark basis`,
      );
      expect(within(basis as HTMLElement).getAllByRole('term')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textContent: 'Platform' }),
          expect.objectContaining({ textContent: 'Coverage' }),
        ]),
      );
      expect(within(basis as HTMLElement).getAllByRole('definition')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textContent: fixture.basis.platform }),
          expect.objectContaining({ textContent: fixture.basis.sample_or_coverage }),
        ]),
      );

      const blockedOutputs = within(card).getByRole('list', {
        name: new RegExp(`${escapeRegExp(viewModel.metricLabel)} blocked benchmark outputs`, 'i'),
      });

      for (const output of viewModel.blockedOutputs) {
        expect(within(blockedOutputs).getByText(output)).toBeInTheDocument();
      }
    },
  );

  it('keeps long synthetic labels and blocked outputs wrapped inside named regions', () => {
    const longContextLabel = 'synthetic-local-fixture-only-with-a-deliberately-long-context-label-that-must-wrap-without-overflow';
    const longBlockedOutput = 'llm-prompt-payload-with-a-deliberately-long-synthetic-output-name-that-must-wrap-cleanly';

    render(
      <KPICard
        title="Synthetic benchmark CPM"
        value="CPM 9,750"
        icon="📊"
        benchmarkStatusLabel="Security review required"
        benchmarkBasisLines={[
          'Platform: Meta',
          'Coverage: Identifier columns detected; aggregate output only',
        ]}
        benchmarkConfidenceLabel="Aggregate-only fixture"
        benchmarkVisibleCopy={[
          'Raw identifiers were excluded from report-ready output.',
        ]}
        benchmarkSyntheticContextLabel={longContextLabel}
        benchmarkBlockedOutputs={[longBlockedOutput]}
      />,
    );

    const card = screen.getByRole('region', {
      name: /synthetic benchmark cpm benchmark trust details/i,
    });
    const context = screen.getByText(longContextLabel);
    const blockedOutputs = within(card).getByRole('list', {
      name: /synthetic benchmark cpm blocked benchmark outputs/i,
    });

    expect(context).toHaveClass('break-words', 'whitespace-normal');
    expect(within(blockedOutputs).getByText(longBlockedOutput)).toHaveClass('break-words');
  });
});
