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

const FORBIDDEN_RENDERED_OPERATOR_COPY = /confidence|신뢰도|확신|확정|보장|promise|certainty/i;

const REQUIRED_RENDER_CONCEPTS: Record<BenchmarkTrustState, RegExp[]> = {
  'benchmark-ready': [
    /예시 벤치마크 cpm/i,
    /검토자 승인 대기/i,
    /검토 근거 충분/i,
    /최근 6개월 기준 기간/i,
    /로컬 검증용 예시 데이터/i,
    /벤치마크 가져오기/i,
    /데이터베이스 반영/i,
  ],
  'low-confidence': [
    /운영자 검토 필요/i,
    /검토 근거 부족/i,
    /표본 범위 부족/i,
    /보고서 또는 내보내기 전에 검토 근거 부족 사유/i,
    /성과 단정 표현/i,
  ],
  'long-term-trend-only': [
    /장기 추세 참고 전용/i,
    /최근 6개월 기준보다 오래된 기간/i,
    /기본 벤치마크 기준에서 제외/i,
    /최근 벤치마크와 추세 참고 데이터는 분리/i,
  ],
  'validation-error': [
    /검증 오류/i,
    /필수 항목인 지출 값이 누락/i,
    /저장/i,
    /모델 사용/i,
    /보고서 표시/i,
  ],
  'security-review-required': [
    /보안 검토 필요/i,
    /반영 전 보안 검토/i,
    /정규화 미리보기/i,
    /보고서 내보내기/i,
    /외부 생성 요청/i,
  ],
  'raw-identifier-risk': [
    /원본 식별자 위험/i,
    /집계 기준만 표시/i,
    /원본 식별자는 보고서 표시에서 제외/i,
    /원본 식별자 표시/i,
    /식별자를 포함한 외부 생성 요청/i,
  ],
  'no-benchmark-data': [
    /사용 가능한 벤치마크 없음/i,
    /사용할 수 있는 집계 벤치마크가 없습니다/i,
    /예시 집계 행 0건/i,
    /예측 임의 생성/i,
    /빈 소스를 근거처럼 표시/i,
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
      expect(renderedText).not.toMatch(FORBIDDEN_RENDERED_OPERATOR_COPY);
    },
  );

  it.each(buildForesightBenchmarkUiStateFixtures())(
    'exposes benchmark trust semantics for %s',
    (fixture) => {
      const viewModel = buildBenchmarkUiStateViewModel(fixture);

      render(<BenchmarkStateProbe fixture={fixture} />);

      const article = screen.getByRole('article', { name: fixture.state });
      const card = within(article).getByRole('region', {
        name: new RegExp(`${escapeRegExp(viewModel.metricLabel)} 벤치마크 검토 근거 세부 정보`, 'i'),
      });

      expect(within(card).getByRole('status')).toHaveAccessibleName(
        `벤치마크 상태: ${viewModel.statusLabel}`,
      );

      const basis = card.querySelector('dl');
      expect(basis).not.toBeNull();
      expect(basis).toHaveAccessibleName(
        `${viewModel.metricLabel} 벤치마크 기준`,
      );
      expect(within(basis as HTMLElement).getAllByRole('term')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textContent: '플랫폼' }),
          expect.objectContaining({ textContent: '표본 범위' }),
        ]),
      );
      expect(within(basis as HTMLElement).getAllByRole('definition')).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ textContent: fixture.basis.platform }),
          expect.objectContaining({ textContent: fixture.basis.sample_or_coverage }),
        ]),
      );

      const blockedOutputs = within(card).getByRole('list', {
        name: new RegExp(`${escapeRegExp(viewModel.metricLabel)} 제한된 벤치마크 출력`, 'i'),
      });

      for (const output of viewModel.blockedOutputs) {
        expect(within(blockedOutputs).getByText(output)).toBeInTheDocument();
      }
    },
  );

  it('keeps long synthetic labels and 제한 출력 문구 wrapped inside named regions', () => {
    const longContextLabel = '로컬-검증용-예시-데이터-라벨이-아주-길어도-카드-밖으로-넘치지-않아야-합니다';
    const longBlockedOutput = '식별자를-포함한-외부-생성-요청-같은-긴-제한-출력-문구도-줄바꿈되어야-합니다';

    render(
      <KPICard
        title="예시 벤치마크 CPM"
        value="CPM 9,750"
        icon="📊"
        benchmarkStatusLabel="보안 검토 필요"
        benchmarkBasisLines={[
          '플랫폼: Meta',
          '표본 범위: 식별자 열 감지, 집계 출력만 허용',
        ]}
        benchmarkConfidenceLabel="집계 기준만 표시"
        benchmarkVisibleCopy={[
          '원본 식별자는 보고서 표시에서 제외되었습니다.',
        ]}
        benchmarkSyntheticContextLabel={longContextLabel}
        benchmarkBlockedOutputs={[longBlockedOutput]}
      />,
    );

    const card = screen.getByRole('region', {
      name: /예시 벤치마크 cpm 벤치마크 검토 근거 세부 정보/i,
    });
    const context = screen.getByText(longContextLabel);
    const blockedOutputs = within(card).getByRole('list', {
      name: /예시 벤치마크 cpm 제한된 벤치마크 출력/i,
    });

    expect(context).toHaveClass('break-words', 'whitespace-normal');
    expect(within(blockedOutputs).getByText(longBlockedOutput)).toHaveClass('break-words');
  });
});
