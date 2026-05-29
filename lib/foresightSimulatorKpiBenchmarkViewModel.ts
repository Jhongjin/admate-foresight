export type SimulatorKpiBenchmarkIcon = 'Reach' | 'CPM' | 'CPC' | 'Link' | 'View' | 'VTR';

export interface SimulatorKpiBenchmarkMarketAverageInput {
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  count: number;
  cpmDiff: number;
  cpcDiff: number;
  cpcLinkDiff: number;
  cpvDiff: number;
  vtrDiff: number;
  industrySelected: boolean;
}

export interface SimulatorKpiBenchmarkResultInput {
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  matchedCount: number;
  marketAvg?: SimulatorKpiBenchmarkMarketAverageInput;
}

export interface SimulatorKpiBenchmarkCardViewModel {
  title: string;
  value: string;
  icon: SimulatorKpiBenchmarkIcon;
  loading: boolean;
  marketLabel?: string;
  diff: number | null;
  lowerBetter: boolean;
  benchmarkStatusLabel: string;
  benchmarkEvidenceLabel: string;
  benchmarkSyntheticContextLabel: string;
  benchmarkVisibleCopy: string[];
  benchmarkBasisLines: string[];
  benchmarkBlockedOutputs: string[];
}

export interface ForesightSimulatorKpiBenchmarkViewModel {
  cards: SimulatorKpiBenchmarkCardViewModel[];
}

export interface BuildForesightSimulatorKpiBenchmarkViewModelInput {
  result: SimulatorKpiBenchmarkResultInput | null;
  loading: boolean;
  isCalculated: boolean;
  campaignDays: number;
  totalReach: number;
  applySeasonBoost: boolean;
  peakCpmMultiplier: number;
  chartDataLength: number;
  confidenceDisplay: string;
  marketSampleCount: number;
  matchedSampleCount: number;
  objectiveLabel: string;
  genderLabel: string;
  ageLabel: string;
}

const FORBIDDEN_OPERATOR_COPY_PATTERN =
  /(act_\d+|account[_-]?id|campaign[_-]?(?:id|mock|[0-9a-z-]{3,})|ad[_-]?id|adset[_-]?id|provider[_-]?id|https?:\/\/|access[_-]?token|token|cookie|session|secret)/i;

function formatCurrency(value: number): string {
  return `₩${value.toLocaleString()}`;
}

function formatPeopleWithUnit(value: number): string {
  return `${Math.max(0, Math.round(value)).toLocaleString()} 명`;
}

function formatPositiveCurrency(value: number): string {
  return value > 0 ? formatCurrency(value) : '—';
}

function formatPositivePercent(value: number): string {
  return value > 0 ? `${value.toFixed(2)}%` : '—';
}

function roundPercent(value: number): number {
  return Math.round(value * 100 * 10) / 10;
}

function sanitizeOperatorCopy(value: string, fallback = '확인 필요'): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return FORBIDDEN_OPERATOR_COPY_PATTERN.test(trimmed) ? fallback : trimmed;
}

function sanitizeFilterLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '전체';
  return sanitizeOperatorCopy(trimmed);
}

function buildMarketLabel(
  hasMarketBenchmark: boolean,
  value: number,
  formatter: (value: number) => string = formatCurrency,
): string {
  if (!hasMarketBenchmark) return '-';
  if (value <= 0) return '—';
  return formatter(value);
}

function buildBenchmarkStatusLabel(
  input: BuildForesightSimulatorKpiBenchmarkViewModelInput,
  hasMarketBenchmark: boolean,
): string {
  if (!input.result || !input.isCalculated) return '시뮬레이션 후 기준 확인';
  return hasMarketBenchmark ? '업종 매칭 벤치마크' : '전체 기준 벤치마크';
}

function buildBenchmarkBasisLines(
  input: BuildForesightSimulatorKpiBenchmarkViewModelInput,
  hasMarketBenchmark: boolean,
): string[] {
  const sampleLine = hasMarketBenchmark
    ? `${input.marketSampleCount.toLocaleString()}건 / 매칭 ${input.matchedSampleCount.toLocaleString()}건`
    : `매칭 ${input.matchedSampleCount.toLocaleString()}건`;
  const objectiveLabel = sanitizeFilterLabel(input.objectiveLabel);
  const genderLabel = sanitizeFilterLabel(input.genderLabel);
  const ageLabel = sanitizeFilterLabel(input.ageLabel);

  return [
    `데이터: ${sampleLine}`,
    `필터: ${objectiveLabel} · ${genderLabel} · ${ageLabel}`,
    '용도: 확정 성과가 아닌 매체 집행 확인',
  ];
}

export function buildForesightSimulatorKpiBenchmarkViewModel(
  input: BuildForesightSimulatorKpiBenchmarkViewModelInput,
): ForesightSimulatorKpiBenchmarkViewModel {
  const hasMarketBenchmark = input.result?.marketAvg?.industrySelected === true;
  const marketAverage = input.result?.marketAvg;
  const marketCpm = marketAverage?.cpm ?? 0;
  const marketCpc = marketAverage?.cpc ?? 0;
  const marketCpcLink = marketAverage?.cpcLink ?? 0;
  const marketCpv = marketAverage?.cpv ?? 0;
  const marketVtr = marketAverage?.vtr ?? 0;
  const marketReach = hasMarketBenchmark && input.result && marketCpm > 0 && input.result.cpm > 0
    ? Math.round((input.totalReach * input.result.cpm) / marketCpm)
    : 0;
  const reachDiff = hasMarketBenchmark && marketReach > 0 && input.totalReach > 0
    ? roundPercent((input.totalReach - marketReach) / marketReach)
    : null;
  const benchmarkStatusLabel = buildBenchmarkStatusLabel(input, hasMarketBenchmark);
  const benchmarkVisibleCopy = [
    input.chartDataLength > 0 ? '예산 구간: 예산 곡선과 같은 실행 결과' : '예산 구간: 계산 대기',
  ];
  const benchmarkBasisLines = buildBenchmarkBasisLines(input, hasMarketBenchmark);
  const blockedOutputs = hasMarketBenchmark ? [] : ['업종 특화 평균처럼 표시하지 않음'];
  const benchmarkProps = {
    benchmarkStatusLabel,
    benchmarkEvidenceLabel: sanitizeOperatorCopy(input.confidenceDisplay, '근거 확인 전'),
    benchmarkSyntheticContextLabel: '최근 6개월 · KRW Net',
    benchmarkVisibleCopy,
  };
  const result = input.result;
  const effectiveCpm = result
    ? input.applySeasonBoost
      ? Math.round(result.cpm * input.peakCpmMultiplier)
      : result.cpm
    : 0;

  return {
    cards: [
      {
        title: `예상 도달 (${input.campaignDays}일)`,
        value: result ? formatPeopleWithUnit(input.totalReach) : '—',
        icon: 'Reach',
        loading: input.loading,
        marketLabel: result ? buildMarketLabel(hasMarketBenchmark, marketReach, formatPeopleWithUnit) : undefined,
        diff: hasMarketBenchmark ? reachDiff : null,
        lowerBetter: false,
        ...benchmarkProps,
        benchmarkBasisLines,
        benchmarkBlockedOutputs: blockedOutputs,
      },
      {
        title: '예상 CPM',
        value: result ? formatCurrency(effectiveCpm) : '—',
        icon: 'CPM',
        loading: input.loading,
        marketLabel: result ? buildMarketLabel(hasMarketBenchmark, marketCpm) : undefined,
        diff: hasMarketBenchmark ? marketAverage?.cpmDiff ?? null : null,
        lowerBetter: true,
        ...benchmarkProps,
        benchmarkBasisLines: [],
        benchmarkBlockedOutputs: [],
      },
      {
        title: 'CPC(전체)',
        value: result ? formatPositiveCurrency(result.cpc) : '—',
        icon: 'CPC',
        loading: input.loading,
        marketLabel: result ? buildMarketLabel(hasMarketBenchmark, marketCpc) : undefined,
        diff: hasMarketBenchmark ? marketAverage?.cpcDiff ?? null : null,
        lowerBetter: true,
        ...benchmarkProps,
        benchmarkBasisLines: [],
        benchmarkBlockedOutputs: [],
      },
      {
        title: 'CPC(링크)',
        value: result ? formatPositiveCurrency(result.cpcLink) : '—',
        icon: 'Link',
        loading: input.loading,
        marketLabel: result ? buildMarketLabel(hasMarketBenchmark, marketCpcLink) : undefined,
        diff: hasMarketBenchmark ? marketAverage?.cpcLinkDiff ?? null : null,
        lowerBetter: true,
        ...benchmarkProps,
        benchmarkBasisLines: [],
        benchmarkBlockedOutputs: [],
      },
      {
        title: '동영상 3초 조회당 비용',
        value: result ? formatPositiveCurrency(result.cpv) : '—',
        icon: 'View',
        loading: input.loading,
        marketLabel: result ? buildMarketLabel(hasMarketBenchmark, marketCpv) : undefined,
        diff: hasMarketBenchmark ? marketAverage?.cpvDiff ?? null : null,
        lowerBetter: true,
        ...benchmarkProps,
        benchmarkBasisLines: [],
        benchmarkBlockedOutputs: [],
      },
      {
        title: 'VTR(3s)',
        value: result ? formatPositivePercent(result.vtr) : '—',
        icon: 'VTR',
        loading: input.loading,
        marketLabel: result ? buildMarketLabel(hasMarketBenchmark, marketVtr, (value) => `${value.toFixed(2)}%`) : undefined,
        diff: hasMarketBenchmark ? marketAverage?.vtrDiff ?? null : null,
        lowerBetter: false,
        ...benchmarkProps,
        benchmarkBasisLines: [],
        benchmarkBlockedOutputs: [],
      },
    ],
  };
}
