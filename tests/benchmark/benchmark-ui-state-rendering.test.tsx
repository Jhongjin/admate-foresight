import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildForesightBenchmarkUiStateFixtures,
  type BenchmarkTrustState,
} from '../../lib/benchmark/uiStateFixtures.mts';
import { buildBenchmarkUiStateViewModel } from '../../lib/benchmark/uiStateViewModel';

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
      <h1>{viewModel.statusLabel}</h1>
      <p>{viewModel.metricLabel}</p>
      <p>{viewModel.metricValue}</p>
      <p>{viewModel.confidenceLabel}</p>
      <p>{viewModel.syntheticContextLabel}</p>
      <section aria-label="basis">
        {viewModel.basisLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
      <section aria-label="visible-copy">
        {viewModel.visibleCopy.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
      <section aria-label="blocked-outputs">
        {viewModel.blockedOutputs.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
      <section aria-label="redaction">
        {viewModel.redactionExpectations.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
      <output aria-label="report-ready">{String(viewModel.reportReady)}</output>
      <output aria-label="promotion-ready">{String(viewModel.promotionReady)}</output>
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

      expect(screen.getByLabelText('report-ready').textContent).toBe('false');
      expect(screen.getByLabelText('promotion-ready').textContent).toBe('false');
    },
  );
});
