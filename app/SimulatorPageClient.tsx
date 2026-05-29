'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import KPICard from '@/components/KPICard';
import ConditionTags from '@/components/ConditionTags';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import PlanningStatePanel from '@/components/PlanningStatePanel';
import StatePanel from '@/components/StatePanel';
import { buildForesightBudgetBasis } from '@/lib/foresightBudgetBasis';
import { buildForesightSimulatorDecisionViewModel } from '@/lib/foresightSimulatorDecisionViewModel';
import {
  buildSimulatorRangeViewModel,
  formatSimulatorBudget,
} from '@/lib/foresightRangeViewModel';
import { buildForesightSimulatorOptimizationViewModel } from '@/lib/foresightSimulatorOptimizationViewModel';
import { buildForesightSimulatorScenarioViewModel } from '@/lib/foresightSimulatorScenarioViewModel';
import { buildForesightSimulatorKpiBenchmarkViewModel } from '@/lib/foresightSimulatorKpiBenchmarkViewModel';
import {
  buildForesightSimulatorMlBaselineViewModel,
  normalizeForesightSimulatorMlBaselineResponse,
  type ForesightSimulatorMlBaselineResult,
} from '@/lib/foresightSimulatorMlBaselineViewModel';
import {
  buildSimulatorErrorPanel,
  SIMULATOR_PRODUCT_SAFE_ERRORS,
} from '@/lib/foresightSimulatorProductSafeErrorViewModel';
import {
  normalizeForecastRangeResponse,
  type ForecastRangeConfirmation,
  type ForecastRangeConfirmationPoint,
} from '@/lib/forecastRangeConfirmation';

const ALL_GENDERS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];

const OBJECTIVE_LABELS: Record<string, string> = {
  'OUTCOME_AWARENESS':     '인지도',
  'LINK_CLICKS':           '트래픽',
  'OUTCOME_ENGAGEMENT':    '참여',
  'OUTCOME_LEADS':         '잠재고객',
  'APP_INSTALLS':          '앱 홍보',
  'OUTCOME_APP_PROMOTION': '앱 홍보',
  'OUTCOME_SALES':         '판매',
  'ADVANTAGE_APP':         '어드밴티지+ 앱',
  'ADVANTAGE_SHOPPING':    '어드밴티지+ 쇼핑',
  'VIDEO_VIEWS':           '동영상 조회',
  'REACH':                 '도달',
  'BRAND_AWARENESS':       '브랜드 인지',
  'MESSAGES':              '메시지',
  'STORE_VISITS':          '매장 방문',
};

// 항상 표시할 고정 목표 (이미지 순서 기준)
const FIXED_OBJECTIVES = [
  'OUTCOME_AWARENESS',
  'LINK_CLICKS',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'APP_INSTALLS',
  'OUTCOME_SALES',
  'ADVANTAGE_APP',
  'ADVANTAGE_SHOPPING',
];

const ALL_AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

interface MarketAvg {
  cpm: number; cpc: number; cpcLink: number; cpv: number; vtr: number; count: number;
  score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cpmDiff: number; cpcDiff: number; cpcLinkDiff: number; cpvDiff: number; vtrDiff: number;
  top20pctCpm: number;
  top20pctCpc: number;
  industrySelected: boolean;
}

interface PredictResult {
  reach: number;
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  frequency: number;
  matchedCount: number;
  r2Cpm?: number;
  r2Cpc?: number;
  r2Vtr?: number;
  predictionMethod?: 'regression' | 'weighted_avg' | 'fallback';
  marketAvg?: MarketAvg;
  // 고도화 필드
  insights?: string[];
  seasonalityMultiplier?: number;
  seasonalityReason?: string;
  qualityIndex?: number;
  qualityPenaltyPct?: number;
  saturationWarning?: boolean;
}

interface ScenarioResult {
  label: string;
  description: string;
  cpm: number;
  reach: number;
  vtr: number;
  cpc: number;
}

type RangePoint = ForecastRangeConfirmationPoint;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readPredictionMethod(value: unknown): PredictResult['predictionMethod'] | undefined {
  return value === 'regression' || value === 'weighted_avg' || value === 'fallback'
    ? value
    : undefined;
}

function normalizeMarketAvg(value: unknown): MarketAvg | undefined {
  if (!isRecord(value)) return undefined;

  const cpm = readFiniteNumber(value.cpm);
  const cpc = readFiniteNumber(value.cpc);
  const cpcLink = readFiniteNumber(value.cpcLink);
  const cpv = readFiniteNumber(value.cpv);
  const vtr = readFiniteNumber(value.vtr);
  const count = readFiniteNumber(value.count);
  const score = readFiniteNumber(value.score);
  const cpmDiff = readFiniteNumber(value.cpmDiff);
  const cpcDiff = readFiniteNumber(value.cpcDiff);
  const cpcLinkDiff = readFiniteNumber(value.cpcLinkDiff);
  const cpvDiff = readFiniteNumber(value.cpvDiff);
  const vtrDiff = readFiniteNumber(value.vtrDiff);
  const top20pctCpm = readFiniteNumber(value.top20pctCpm);
  const top20pctCpc = readFiniteNumber(value.top20pctCpc);
  const grade = value.grade === 'A' || value.grade === 'B' || value.grade === 'C' || value.grade === 'D' || value.grade === 'F'
    ? value.grade
    : null;
  const industrySelected = typeof value.industrySelected === 'boolean'
    ? value.industrySelected
    : null;

  if (
    cpm == null || cpc == null || cpcLink == null || cpv == null || vtr == null ||
    count == null || score == null || grade == null || cpmDiff == null ||
    cpcDiff == null || cpcLinkDiff == null || cpvDiff == null || vtrDiff == null ||
    top20pctCpm == null || top20pctCpc == null || industrySelected == null
  ) {
    return undefined;
  }

  return {
    cpm,
    cpc,
    cpcLink,
    cpv,
    vtr,
    count,
    score,
    grade,
    cpmDiff,
    cpcDiff,
    cpcLinkDiff,
    cpvDiff,
    vtrDiff,
    top20pctCpm,
    top20pctCpc,
    industrySelected,
  };
}

function normalizePredictResult(value: unknown): PredictResult | null {
  if (!isRecord(value)) return null;

  const reach = readFiniteNumber(value.reach);
  const cpm = readFiniteNumber(value.cpm);
  const cpc = readFiniteNumber(value.cpc);
  const cpcLink = readFiniteNumber(value.cpcLink);
  const cpv = readFiniteNumber(value.cpv);
  const vtr = readFiniteNumber(value.vtr);
  const frequency = readFiniteNumber(value.frequency);
  const matchedCount = readFiniteNumber(value.matchedCount);

  if (
    reach == null || cpm == null || cpc == null || cpcLink == null ||
    cpv == null || vtr == null || frequency == null || matchedCount == null
  ) {
    return null;
  }

  const result: PredictResult = {
    reach,
    cpm,
    cpc,
    cpcLink,
    cpv,
    vtr,
    frequency,
    matchedCount,
  };

  const r2Cpm = readFiniteNumber(value.r2Cpm);
  if (r2Cpm != null) result.r2Cpm = r2Cpm;
  const r2Cpc = readFiniteNumber(value.r2Cpc);
  if (r2Cpc != null) result.r2Cpc = r2Cpc;
  const r2Vtr = readFiniteNumber(value.r2Vtr);
  if (r2Vtr != null) result.r2Vtr = r2Vtr;
  const seasonalityMultiplier = readFiniteNumber(value.seasonalityMultiplier);
  if (seasonalityMultiplier != null) result.seasonalityMultiplier = seasonalityMultiplier;
  const qualityIndex = readFiniteNumber(value.qualityIndex);
  if (qualityIndex != null) result.qualityIndex = qualityIndex;
  const qualityPenaltyPct = readFiniteNumber(value.qualityPenaltyPct);
  if (qualityPenaltyPct != null) result.qualityPenaltyPct = qualityPenaltyPct;

  const predictionMethod = readPredictionMethod(value.predictionMethod);
  if (predictionMethod) result.predictionMethod = predictionMethod;
  const marketAvg = normalizeMarketAvg(value.marketAvg);
  if (marketAvg) result.marketAvg = marketAvg;
  if (Array.isArray(value.insights)) {
    result.insights = value.insights.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value.seasonalityReason === 'string') result.seasonalityReason = value.seasonalityReason;
  if (typeof value.saturationWarning === 'boolean') result.saturationWarning = value.saturationWarning;

  return result;
}

async function readJsonOrNull(response: Response): Promise<unknown | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function toJsonOrThrow(response: Response): Promise<unknown> {
  if (!response.ok) throw new Error('request_failed');
  return response.json();
}

export default function SimulatorPage() {
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availableObjectives, setAvailableObjectives] = useState<string[]>([]);

  // 캠페인 기간 (일수 단위)
  const [campaignDays, setCampaignDays] = useState(7);
  // 성수기/시즌 할증 수동 옵션
  const [applySeasonBoost, setApplySeasonBoost] = useState(false);
  const PEAK_CPM_MULTIPLIER = 1.3;

  // Multi-select state (empty = 전체)
  const [industries, setIndustries] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [ageRanges, setAgeRanges] = useState<string[]>([]);
  const [budget, setBudget] = useState(10_000_000);
  const dailyBudget = Math.round(budget / campaignDays);

  const [budgetInput, setBudgetInput] = useState('10000000');

  const [isCalculated, setIsCalculated] = useState(false);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rangeData, setRangeData] = useState<RangePoint[]>([]);
  const [rangeConfirmation, setRangeConfirmation] = useState<ForecastRangeConfirmation | null>(null);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [filtersError, setFiltersError] = useState(false);
  const [predictionError, setPredictionError] = useState(false);
  const [rangeError, setRangeError] = useState(false);
  const [scenarioError, setScenarioError] = useState(false);

  // ── ML 예측 (Python FastAPI) ────────────────────────────
  const [mlResult, setMlResult]   = useState<ForesightSimulatorMlBaselineResult | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError]     = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenarioDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/filters')
      .then(toJsonOrThrow)
      .then((f) => {
        if (!isRecord(f) || !Array.isArray(f.industries)) throw new Error('request_failed');
        setAvailableIndustries(f.industries.filter((item): item is string => typeof item === 'string'));
        setAvailableObjectives(Array.isArray(f.objectives) ? f.objectives.filter((item): item is string => typeof item === 'string') : []);
        setFiltersError(false);
      })
      .catch(() => {
        console.warn('[simulator:filters] 필터 정보를 불러오지 못했습니다.');
        setFiltersError(true);
      });
  }, []);

  const fetchPrediction = useCallback(async (params: {
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[]; budget: number; monthFrom?: string; monthTo?: string;
  }) => {
    setLoading(true);
    setPredictionError(false);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        setPredictionError(true);
        return;
      }
      const data = await readJsonOrNull(res);
      const nextResult = normalizePredictResult(data);
      setResult(nextResult);
      setPredictionError(!nextResult);
      if (!nextResult) console.warn('[simulator:predict] 기본 예측을 불러오지 못했습니다.');
    } catch {
      console.warn('[simulator:predict] 기본 예측을 불러오지 못했습니다.');
      setPredictionError(true);
    }
    finally { setLoading(false); }
  }, []);

  const fetchMlPrediction = useCallback(async (params: {
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[]; budget: number; campaignDays: number;
  }) => {
    setMlLoading(true);
    setMlError('');
    try {
      const res = await fetch('/api/py-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          업종:  params.industries[0] ?? '',
          목표:  params.objectives[0] ?? '',
          성별:  params.genders[0]   ?? '',
          연령:  params.ageRanges[0] ?? '',
          예산:  params.budget,
          기간:  params.campaignDays,
        }),
      });
      if (!res.ok) { setMlError(SIMULATOR_PRODUCT_SAFE_ERRORS.mlBaseline.title); setMlResult(null); return; }
      const data = await readJsonOrNull(res);
      const nextResult = normalizeForesightSimulatorMlBaselineResponse(data);
      setMlResult(nextResult);
      if (!nextResult) {
        console.warn('[simulator:ml-baseline] 보조 기준선을 불러오지 못했습니다.');
        setMlError(SIMULATOR_PRODUCT_SAFE_ERRORS.mlBaseline.title);
      }
    } catch { setMlError(SIMULATOR_PRODUCT_SAFE_ERRORS.mlBaseline.title); setMlResult(null); }
    finally { setMlLoading(false); }
  }, []);

  const fetchRange = useCallback(async (params: {
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[]; budget: number; monthFrom?: string; monthTo?: string;
  }) => {
    setRangeLoading(true);
    setRangeError(false);
    try {
      const res = await fetch('/api/predict-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        setRangeError(true);
        return;
      }
      const data = await readJsonOrNull(res);
      const { rangeData: nextRangeData, confirmation } = normalizeForecastRangeResponse(data);
      setRangeData(nextRangeData ?? []);
      setRangeConfirmation(confirmation);
      setRangeError(!nextRangeData);
      if (!nextRangeData) console.warn('[simulator:predict-range] 예산 구간을 불러오지 못했습니다.');
    } catch {
      console.warn('[simulator:predict-range] 예산 구간을 불러오지 못했습니다.');
      setRangeError(true);
    }
    finally { setRangeLoading(false); }
  }, []);

  // API 예측은 월 기준 예산으로 맞추고, 화면 표시는 캠페인 기간 기준으로 환산한다.
  const budgetBasis = buildForesightBudgetBasis(budget, campaignDays);
  const monthlyBudget = budgetBasis.monthlyBudget;

  useEffect(() => {
    if (!isCalculated) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget });
    }, 300);
  }, [isCalculated, industries, genders, ageRanges, objectives, monthlyBudget, fetchPrediction]);

  useEffect(() => {
    if (!isCalculated) return;
    if (rangeDebounceRef.current) clearTimeout(rangeDebounceRef.current);
    rangeDebounceRef.current = setTimeout(() => {
      fetchRange({ industries, genders, ageRanges, objectives, budget: monthlyBudget });
    }, 400);
  }, [isCalculated, industries, genders, ageRanges, objectives, monthlyBudget, fetchRange]);

  // ML 예측 (Python FastAPI) — 조건 변경 시 자동 갱신
  useEffect(() => {
    if (!isCalculated) return;
    const t = setTimeout(() => {
      fetchMlPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget, campaignDays });
    }, 350);
    return () => clearTimeout(t);
  }, [isCalculated, industries, genders, ageRanges, objectives, monthlyBudget, campaignDays, fetchMlPrediction]);

  // 시뮬레이션 시작 핸들러 — 이전 결과 초기화 후 즉시 fetch
  const handleStartSimulation = useCallback(() => {
    const wasCalculated = isCalculated;
    setResult(null);
    setRangeData([]);
    setRangeConfirmation(null);
    setScenarios([]);
    setPredictionError(false);
    setRangeError(false);
    setScenarioError(false);
    setIsCalculated(true);
    fetchPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget });
    // 이미 계산된 상태(재시뮬레이션)이면 useEffect가 재실행되지 않으므로 직접 호출
    // 처음 계산 시에는 isCalculated 변화에 의해 useEffect가 fetchRange를 호출하므로 중복 방지
    if (wasCalculated) {
      fetchRange({ industries, genders, ageRanges, objectives, budget: monthlyBudget });
    }
  }, [isCalculated, industries, genders, ageRanges, objectives, monthlyBudget, fetchPrediction, fetchRange]);

  // 테이블 클릭 등 외부에서 budget 변경 시 input 동기화
  useEffect(() => {
    setBudgetInput(String(budget));
  }, [budget]);

  // 타겟 확장 시나리오 fetch
  useEffect(() => {
    if (!isCalculated) return;
    if (scenarioDebounceRef.current) clearTimeout(scenarioDebounceRef.current);
    scenarioDebounceRef.current = setTimeout(async () => {
      const hasFilter = genders.length > 0 || ageRanges.length > 0 || industries.length > 0;
      if (!hasFilter) { setScenarios([]); setScenarioError(false); return; }

      const expansions: Array<{ label: string; description: string; body: object }> = [];
      if (genders.length > 0) {
        expansions.push({
          label: '성별 전체 확장',
          description: `${genders.map(g => g === 'male' ? '남성' : '여성').join('/')} → 전체`,
          body: { industries, genders: [], ageRanges, objectives, budget: monthlyBudget },
        });
      }
      if (ageRanges.length > 0) {
        expansions.push({
          label: '연령 전체 확장',
          description: `${ageRanges.join(', ')} → 전체`,
          body: { industries, genders, ageRanges: [], objectives, budget: monthlyBudget },
        });
      }
      // 업종 확장은 캠페인 대전제이므로 시나리오에서 제외

      setScenarioLoading(true);
      setScenarioError(false);
      try {
        const results = await Promise.all(
          expansions.map(async (e) => {
            const res = await fetch('/api/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(e.body),
            });
            if (!res.ok) return null;
            return normalizePredictResult(await readJsonOrNull(res));
          })
        );
        const hasScenarioError = results.some((scenarioResult) => !scenarioResult);
        setScenarioError(hasScenarioError);
        if (hasScenarioError) console.warn('[simulator:scenario] 타겟 확장 시나리오를 불러오지 못했습니다.');
        setScenarios(expansions.flatMap((e, i) => {
          const scenarioResult = results[i];
          if (!scenarioResult) return [];
          return [{
            label: e.label,
            description: e.description,
            cpm: scenarioResult.cpm,
            reach: scenarioResult.reach,
            vtr: scenarioResult.vtr,
            cpc: scenarioResult.cpc,
          }];
        }));
      } catch {
        console.warn('[simulator:scenario] 타겟 확장 시나리오를 불러오지 못했습니다.');
        setScenarioError(true);
        setScenarios([]);
      }
      finally { setScenarioLoading(false); }
    }, 600);
  }, [isCalculated, industries, genders, ageRanges, objectives, monthlyBudget]);

  function toggleGender(value: string) {
    setGenders((prev) =>
      prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]
    );
  }

  function toggleObjective(value: string) {
    setObjectives((prev) =>
      prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value]
    );
  }

  function toggleAgeRange(value: string) {
    setAgeRanges((prev) =>
      prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]
    );
  }

  // Condition tags
  const industryLabel = industries.length === 0 ? '전체' : industries.join(', ');
  const genderLabel = genders.length === 0 ? '전체'
    : genders.map((g) => g === 'male' ? '남성' : '여성').join(', ');
  const ageLabel = ageRanges.length === 0 ? '전체' : ageRanges.join(', ');
  const objectiveLabel = objectives.length === 0
    ? '전체'
    : objectives.map((o) => OBJECTIVE_LABELS[o] ?? o).join(', ');

  const durationLabel = `${campaignDays}일`;

  const tags = [
    { label: '총 예산', value: `₩${budget.toLocaleString()}` },
    { label: '캠페인 기간', value: durationLabel },
    { label: '캠페인 목표', value: objectiveLabel },
    { label: '업종', value: industryLabel },
    { label: '성별', value: genderLabel },
    { label: '연령대', value: ageLabel },
  ];

  // 기간 스케일 팩터 (월 기준 예측값 → 캠페인 기간 환산)
  const durationFactor = budgetBasis.durationFactor;
  const totalReach = result ? Math.round(result.reach * durationFactor) : 0;
  const selectedTargetCount = industries.length + genders.length + ageRanges.length + objectives.length;
  const marketSelected = result?.marketAvg?.industrySelected === true;
  const marketSampleCount = result?.marketAvg?.count ?? 0;
  const matchedSampleCount = result?.matchedCount ?? 0;
  // Range API 결과는 월 기준이고, 곡선/표는 입력한 캠페인 기간 기준으로 표시한다.
  const { chartData, rangeTrendBrief } = buildSimulatorRangeViewModel({
    rangeData,
    campaignDays,
    selectedBudget: budget,
  });
  // Static contract markers: 보고서 출력은 검토용, 리포트/내보내기/승격/적용 준비 false, 확정 성과 표현 금지 원칙
  const {
    readinessTone,
    readinessLabel,
    benchmarkDetail,
    actionHint,
    confidenceScore,
    evidenceBasisLabel,
    confidenceDisplay,
    confidenceGateStatus,
    confidenceGateTone,
    confidenceTone,
    sampleStatus,
    sampleStatusLegend,
    nextActionTitle,
    forecastPreview,
    readinessChecks,
    planningBasis,
    predictionRangeRows,
    truthBandLabel,
    decisionGateRows,
    evidencePanelTone,
    forecastGuardrails,
    dataSufficiencyStatus,
    dataSufficiencyToneClassName,
    dataSufficiencyLedger,
    forecastEmptySignals,
    forecastEmptyStages,
  } = buildForesightSimulatorDecisionViewModel({
    result,
    loading,
    isCalculated,
    rangeLoading,
    rangeConfirmation,
    selectedTargetCount,
    marketSelected,
    marketSampleCount,
    matchedSampleCount,
    campaignDays,
    durationLabel,
    budget,
    totalReach,
    applySeasonBoost,
    peakCpmMultiplier: PEAK_CPM_MULTIPLIER,
    chartDataLength: chartData.length,
    objectiveLabel,
    genderLabel,
    ageLabel,
  });
  const planBrief = [
    { label: '예산', value: `₩${budget.toLocaleString()}`, detail: `일 평균 ₩${dailyBudget.toLocaleString()}` },
    { label: '기간', value: durationLabel, detail: `월 환산 ₩${monthlyBudget.toLocaleString()}` },
    { label: '목표', value: objectiveLabel, detail: objectives.length === 0 ? '목표 전체 기준' : `${objectives.length}개 목표` },
    { label: '타겟', value: `${industryLabel} · ${ageLabel}`, detail: `성별 ${genderLabel}` },
  ];
  const cockpitTimeline = [
    { label: '입력 고정', active: true },
    { label: '예측 확인', active: isCalculated || loading },
    { label: '다음 확인', active: Boolean(result) },
  ];

  const optimizationGuide = buildForesightSimulatorOptimizationViewModel({
    result,
    rangeData,
    scenarios,
    scenarioLoading,
    scenarioError,
    loading,
    isCalculated,
    monthlyBudget,
    campaignBudget: budget,
    durationFactor,
    totalReach,
    confidenceScore,
    confidenceGateStatus,
    confidenceGateTone,
  });
  const scenarioViewModel = buildForesightSimulatorScenarioViewModel({
    result,
    scenarios,
    scenarioLoading,
    scenarioError,
    loading,
    isCalculated,
    durationFactor,
    totalReach,
    confidenceScore,
    confidenceGateStatus,
    confidenceGateTone,
  });
  const kpiBenchmarkViewModel = buildForesightSimulatorKpiBenchmarkViewModel({
    result,
    loading,
    isCalculated,
    campaignDays,
    totalReach,
    applySeasonBoost,
    peakCpmMultiplier: PEAK_CPM_MULTIPLIER,
    chartDataLength: chartData.length,
    confidenceDisplay,
    marketSampleCount,
    matchedSampleCount,
    objectiveLabel,
    genderLabel,
    ageLabel,
  });
  const mlBaselineViewModel = buildForesightSimulatorMlBaselineViewModel({
    result: mlResult,
    loading: mlLoading,
    errorMessage: mlError,
    isCalculated,
    hasPrimaryPrediction: Boolean(result),
  });

  const rangeEmptySignals = [
    {
      label: '구간 상태',
      value: isCalculated ? '곡선 행 없음' : '실행 필요',
      detail: '계산된 예산 구간이 있을 때만 곡선을 표시합니다.',
    },
    {
      label: '현재 예산',
      value: `₩${budget.toLocaleString()}`,
      detail: `월 환산 ₩${monthlyBudget.toLocaleString()} · ${durationLabel}`,
    },
    {
      label: '다음 확인',
      value: isCalculated ? '조건 재검토' : '시뮬레이션 시작',
      detail: isCalculated ? '필터를 넓히거나 다시 실행해 범위를 확인하세요.' : '좌측 조건 확인 후 예측을 실행하세요.',
    },
  ];
  const rangeEmptyStages = [
    { label: '예산 스윕', status: '구간 행 필요' },
    { label: '도달 곡선', status: '체감 효율 확인' },
    { label: '효율 확인', status: '한계 신호' },
    { label: '다음 확인', status: isCalculated ? '입력 재실행' : '예측 시작' },
  ];
  const comparisonEmptySignals = [
    {
      label: '표 표시 원칙',
      value: '계산 행만 표시',
      detail: '도달, 노출, 클릭은 예산 구간 계산 결과가 있을 때만 노출합니다.',
    },
    {
      label: '기준선 안전장치',
      value: '임의 채움 없음',
      detail: '빈 소스를 벤치마크처럼 표시하지 않습니다.',
    },
    {
      label: '다음 확인',
      value: chartData.length > 0 ? '행 준비됨' : '구간 대기',
      detail: '곡선이 생성되면 동일한 데이터로 비교표가 채워집니다.',
    },
  ];
  const comparisonEmptyStages = [
    { label: '원천 행', status: '동일 구간 데이터' },
    { label: '선택 예산', status: `₩${budget.toLocaleString()}` },
    { label: '표시 항목', status: '도달 / 노출 / 클릭' },
    { label: '사용 목적', status: '예산안 선택' },
  ];
  const filtersErrorPanel = buildSimulatorErrorPanel('filters', '조건 선택지 로드 실패');
  const predictionErrorPanel = buildSimulatorErrorPanel('prediction', result ? '이전 정상 결과 유지' : '새 예측 결과 없음');
  const rangeErrorPanel = buildSimulatorErrorPanel('range', chartData.length > 0 ? '이전 예산 구간 유지' : '예산 구간 없음');
  const scenarioErrorPanel = buildSimulatorErrorPanel('scenario', scenarios.length > 0 ? '일부 시나리오만 표시' : '확장 비교 없음');
  const mlErrorPanel = buildSimulatorErrorPanel('mlBaseline', mlBaselineViewModel.error.detail);

  return (
    <div className="foresight-workspace space-y-6">
      <section className="foresight-hero-shell overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm">
        <div className="foresight-hero-head border-b border-stone-200 px-5 py-6 text-slate-950 sm:px-6 lg:px-8 lg:py-8">
          <div className="foresight-hero-grid">
            <div className="foresight-hero-copy">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${readinessTone}`}>
                  {readinessLabel}
                </span>
                <span className="inline-flex rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
                  AdMate 기준 데이터
                </span>
                <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${sampleStatus.tone}`}>
                  {sampleStatus.label}
                </span>
              </div>

              <h1 className="foresight-hero-title" aria-label="AdMate Foresight 성과 예측">
                AdMate Foresight 성과 예측
              </h1>

              <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                예산, 기간, 타겟 조건에 따른 예상 성과와 AdMate 기준 데이터를 함께 봅니다.
                표본 상태가 부족하면 예측 결과와 구간 판단을 분리해 표시합니다.
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {sampleStatusLegend.map((item) => (
                  <div key={item.label} className="rounded-md border border-stone-200 bg-white/70 px-3 py-2">
                    <p className="text-xs font-bold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="foresight-observatory" aria-label="예측 관측 상태">
              <div className="foresight-observatory-topline">
                <div>
                  <p className="text-[11px] font-semibold text-stone-500">예측 범위</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">예산 집행 기준 확인</p>
                </div>
                <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${readinessTone}`}>
                  {sampleStatus.label}
                </span>
              </div>

              <div className="foresight-curve-field">
                <div className="foresight-curve-band" />
                <svg viewBox="0 0 420 180" role="img" aria-label="예상 도달 곡선">
                  <path
                    d="M28 142 C92 118 118 82 174 94 C230 106 244 58 306 66 C354 72 382 46 402 35"
                    fill="none"
                    stroke="#0f766e"
                    strokeLinecap="round"
                    strokeWidth="5"
                  />
                  <path
                    d="M30 154 C96 130 120 96 176 108 C232 120 248 76 308 84 C354 90 382 64 402 52"
                    fill="none"
                    stroke="#b7791f"
                    strokeDasharray="8 10"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                  />
                  <circle cx="174" cy="94" r="6" fill="#fbfaf6" stroke="#0f766e" strokeWidth="4" />
                  <circle cx="306" cy="66" r="6" fill="#fbfaf6" stroke="#0f766e" strokeWidth="4" />
                  <circle cx="402" cy="35" r="6" fill="#101820" />
                </svg>
                <div className="foresight-curve-label foresight-curve-label--left">
                  <span>예산</span>
                  <strong>{formatSimulatorBudget(budget)}</strong>
                </div>
                <div className="foresight-curve-label foresight-curve-label--right">
                  <span>근거</span>
                  <strong>{confidenceDisplay}</strong>
                </div>
              </div>

              <div className="foresight-observatory-ledger">
                {[...readinessChecks, { label: '데이터 상태', value: sampleStatus.detail }].map((check) => (
                  <div key={check.label}>
                    <span>{check.label}</span>
                    <strong>{check.value}</strong>
                  </div>
                ))}
              </div>

              <div className="foresight-timeline mt-3 grid min-w-0 grid-cols-3 gap-1 rounded-md border border-stone-300 bg-white p-1 shadow-sm">
                {cockpitTimeline.map((step) => (
                  <div
                    key={step.label}
                    className={`rounded px-3 py-2 text-center text-[11px] font-semibold ${
                      step.active ? 'bg-slate-950 text-white' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">집행 요약</h2>
                  <p className="mt-1 text-xs text-slate-500">매체 집행 조건을 고정하고 예측 입력값을 정리합니다.</p>
                </div>
                <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  조건 {selectedTargetCount}개
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {planBrief.map((item) => (
                  <div key={item.label} className="rounded-md border border-slate-200 bg-[#f7faf8] px-3 py-3">
                    <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-950">{item.value}</p>
                    <p className="mt-1 truncate text-[11px] text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900">기준선 근거</h3>
                  <span className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">집행 근거</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {planningBasis.map((item) => (
                    <div key={item.label} className="rounded-md border border-amber-100 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-amber-700">{item.label}</p>
                      <p className="mt-1 text-sm font-bold text-slate-950">{item.value}</p>
                      <p className="mt-0.5 break-words text-[11px] leading-snug text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Campaign Settings */}
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">조건 설정</h2>
                  <p className="text-xs text-slate-500">예산, 기간, 타겟 조건을 조정합니다.</p>
                </div>
              </div>
              {filtersError && (
                <StatePanel
                  variant="error"
                  title={filtersErrorPanel.title}
                  description={filtersErrorPanel.description}
                  ledger={filtersErrorPanel.ledger}
                  nextActions={filtersErrorPanel.nextActions}
                  className="mb-4 min-h-0 py-4"
                />
              )}
              <div className="space-y-4">

          {/* 1. 캠페인 예산 */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label htmlFor="foresight-campaign-budget" className="text-sm font-medium text-slate-700 sm:w-24 sm:shrink-0">총 캠페인 예산</label>
            <div className="flex w-full min-w-0 items-center border border-slate-200 rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-teal-700 bg-white sm:max-w-xs sm:flex-1">
              <span className="text-sm text-slate-400 mr-1">₩</span>
              <input
                id="foresight-campaign-budget"
                type="number"
                value={budgetInput}
                min={1_000_000}
                max={5_000_000_000}
                step={1_000_000}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={(e) => {
                  const v = parseInt(e.target.value.replace(/,/g, ''), 10);
                  if (!isNaN(v)) {
                    const clamped = Math.min(5_000_000_000, Math.max(1_000_000, v));
                    setBudget(clamped);
                    setBudgetInput(String(clamped));
                  } else {
                    setBudgetInput(String(budget));
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                className="flex-1 text-sm text-slate-800 font-medium focus:outline-none min-w-0"
              />
            </div>
            <span className="text-sm font-bold text-teal-700 sm:shrink-0">
              {budget >= 100_000_000 ? `${budget / 100_000_000}억` : budget >= 10_000 ? `${(budget / 10_000).toLocaleString()}만원` : `${budget.toLocaleString()}원`}
            </span>
          </div>

          <div className="border-t border-gray-50" />

          {/* 2. 캠페인 기간 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">캠페인 기간</label>
              <span className="text-sm font-bold text-teal-700">{campaignDays}일</span>
            </div>

            {/* 프리셋 버튼 */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '1주일 이하', days: 7, activeWithin: true },
                { label: '2주일',     days: 14 },
                { label: '1개월',     days: 30 },
                { label: '2개월',     days: 60 },
                { label: '3개월',     days: 90 },
                { label: '6개월',     days: 180 },
                { label: '1년',       days: 365 },
              ].map(({ label, days, activeWithin }) => {
                const active = activeWithin ? campaignDays <= days : campaignDays === days;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCampaignDays(days)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* 슬라이더 + 드래그 툴팁 */}
            <div className="px-1">
              <div className="relative pt-7">
                {/* 떠다니는 일수 배지 */}
                <div
                  className="absolute top-0 text-[11px] font-semibold text-white bg-teal-700 rounded-md px-1.5 py-0.5 pointer-events-none select-none whitespace-nowrap shadow-sm"
                  style={(() => {
                    const pct = ((campaignDays - 1) / 364) * 100;
                    return {
                      left: `calc(${pct}% + ${(8 - pct * 0.16).toFixed(1)}px)`,
                      transform: 'translateX(-50%)',
                    };
                  })()}
                >
                  {campaignDays}일
                </div>
                <input
                  type="range"
                  aria-label="캠페인 기간"
                  min={1}
                  max={365}
                  value={campaignDays}
                  onChange={(e) => setCampaignDays(Number(e.target.value))}
                  className="w-full accent-teal-700 h-1.5 rounded-full cursor-pointer"
                />
              </div>
              {/* 눈금 레이블 — thumb 공식과 동일한 위치에 절대 배치 */}
              <div className="relative h-4 mt-1">
                {([
                  { label: '1일',   days: 1 },
                  { label: '1개월', days: 30 },
                  { label: '6개월', days: 180 },
                  { label: '1년',   days: 365 },
                ] as { label: string; days: number }[]).map(({ label, days }) => {
                  const pct = ((days - 1) / 364) * 100;
                  return (
                    <span
                      key={label}
                      className="absolute text-[11px] text-slate-400 -translate-x-1/2"
                      style={{ left: `calc(${pct}% + ${(8 - pct * 0.16).toFixed(1)}px)` }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50" />

          {/* 성수기/시즌 할증 */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={applySeasonBoost}
              onClick={() => setApplySeasonBoost((v) => !v)}
              className="group flex items-center gap-2.5 rounded-md py-1 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
            >
              <span
                aria-hidden="true"
                className={`relative h-5 w-9 rounded-full transition-colors ${applySeasonBoost ? 'bg-amber-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${applySeasonBoost ? 'translate-x-4' : ''}`} />
              </span>
              <span className="text-sm font-medium text-slate-700">성수기/시즌 할증 적용</span>
            </button>
            <div className="group relative">
              <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-400 text-[11px] flex items-center justify-center cursor-help border border-slate-200">?</span>
              <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 w-[min(16rem,calc(100vw-3rem))] rounded-md bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 sm:left-1/2 sm:w-64 sm:-translate-x-1/2">
                연말(11–12월), 명절, 대규모 세일 기간 등 광고 경쟁이 치열한 시기라면 체크하세요.
                <br />CPM에 약 1.3배 할증이 반영됩니다.
              </div>
            </div>
          </div>

          <div className="border-t border-gray-50" />

          {/* 3. 타겟 업종 */}
          <MultiSelectDropdown
            label="타겟 업종"
            options={availableIndustries}
            selected={industries}
            onChange={setIndustries}
            placeholder="전체"
          />

          <div className="border-t border-gray-50" />

          {/* 4. 캠페인 목표 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">캠페인 목표</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                ...FIXED_OBJECTIVES,
                ...availableObjectives.filter((o) => !FIXED_OBJECTIVES.includes(o)),
              ].map((obj) => {
                const active = objectives.includes(obj);
                return (
                  <button key={obj} type="button" onClick={() => toggleObjective(obj)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    }`}>
                    {OBJECTIVE_LABELS[obj] ?? obj}
                  </button>
                );
              })}
              {objectives.length > 0 && (
                <button type="button" onClick={() => setObjectives([])}
                  className="px-3 py-1 rounded-full text-xs text-slate-400 border border-slate-200 hover:text-slate-600 transition-colors">
                  초기화
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-50" />

          {/* 5. 타겟팅 (성별 + 연령대 묶음) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">타겟팅</label>

            {/* 성별 */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400 font-medium w-8 shrink-0">성별</p>
              <div className="flex gap-1.5">
                {ALL_GENDERS.map(({ value, label }) => {
                  const active = genders.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => toggleGender(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                      }`}>
                      {label}
                    </button>
                  );
                })}
                {genders.length > 0 && (
                  <button type="button" onClick={() => setGenders([])}
                    className="px-2 py-1 rounded-full text-xs text-slate-400 border border-slate-200 hover:text-slate-600 transition-colors">
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* 연령대 */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-400 font-medium w-8 shrink-0">연령</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_AGE_RANGES.map((age) => {
                  const active = ageRanges.includes(age);
                  return (
                    <button key={age} type="button" onClick={() => toggleAgeRange(age)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                      }`}>
                      {age}
                    </button>
                  );
                })}
                {ageRanges.length > 0 && (
                  <button type="button" onClick={() => setAgeRanges([])}
                    className="px-2 py-1 rounded-full text-xs text-slate-400 border border-slate-200 hover:text-slate-600 transition-colors">
                    초기화
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
              </div>
            </div>

          <aside className="border-t border-stone-200 bg-[#f8f7f1] p-5 sm:p-6 xl:border-l xl:border-t-0">
            <div className="space-y-4">
              <section className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">예측 곡선 프리뷰</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-950">예산 효율 확인</h2>
                    <p className="mt-1 text-xs text-slate-500">예산, 도달, 빈도를 같은 기준선 위에서 비교합니다.</p>
                  </div>
                  {loading && <div className="h-4 w-4 rounded-full border-2 border-sky-100 border-t-sky-600 animate-spin" />}
                </div>
                <div className="mt-4 grid gap-2">
                  {forecastPreview.map((item, index) => (
                    <div key={item.label} className="rounded-md border border-stone-200 bg-[#fbfaf7] px-3 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-stone-500">{item.label}</p>
                          <p className="mt-1 truncate text-lg font-bold text-slate-950 num">{item.value}</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
                          {index === 0 ? '예산' : index === 1 ? '도달' : '빈도'}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
                        <div
                          className="h-full rounded-full bg-teal-700"
                          style={{ width: `${index === 0 ? 78 : index === 1 ? 64 : 48}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">기준선 준비도</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{benchmarkDetail}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold num ${confidenceTone}`}>
                      {confidenceScore == null ? '-' : confidenceScore}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">근거 점수</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {readinessChecks.map((check) => (
                    <div key={check.label} className="flex items-center justify-between gap-3 rounded-md bg-[#f7faf8] px-3 py-2">
                      <span className="text-xs font-medium text-slate-500">{check.label}</span>
                      <span className="truncate text-right text-xs font-semibold text-slate-950">{check.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-stone-200 bg-[#fbfaf6] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">매체 집행 확인</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-950">집행 전 검토 신호</h2>
                  </div>
                  <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-500">
                    집행 기준
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {decisionGateRows.map((row) => (
                    <div
                      key={row.label}
                      className={`rounded-md border px-3 py-2 ${
                        row.tone === 'ok'
                          ? 'border-emerald-100 bg-emerald-50/70'
                          : row.tone === 'watch'
                            ? 'border-amber-100 bg-amber-50/70'
                            : row.tone === 'risk'
                              ? 'border-red-100 bg-red-50/70'
                              : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{row.label}</p>
                        <span className={`shrink-0 text-[11px] font-bold ${
                          row.tone === 'ok'
                            ? 'text-emerald-700'
                            : row.tone === 'watch'
                              ? 'text-amber-700'
                              : row.tone === 'risk'
                                ? 'text-red-600'
                                : 'text-slate-500'
                        }`}>
                          {row.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">{row.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-amber-300 bg-[#fff7e8] p-4 text-slate-950">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">다음 확인</p>
                <h2 className="mt-1 text-lg font-bold">{nextActionTitle}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-600">{actionHint}</p>
                <button
                  onClick={handleStartSimulation}
                  disabled={loading}
                  className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 active:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-slate-900/30 border-t-slate-950 animate-spin" />
                      예측 계산 중
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {isCalculated ? '다시 시뮬레이션' : '시뮬레이션 시작'}
                    </>
                  )}
                </button>
                <div className="mt-4 border-t border-amber-200 pt-4">
                  <p className="mb-2 text-[11px] font-semibold text-amber-800">현재 적용 조건</p>
                  <ConditionTags tags={tags} />
                </div>
              </section>
            </div>
          </aside>
        </div>
      </section>

      {!isCalculated && !loading && (
        <PlanningStatePanel
          eyebrow="성과 예측 대기"
          title="성과 기준을 계산하기 전입니다"
          description="조건을 확인하고 시뮬레이션을 실행하면 최근 6개월 기준, 필터, 근거 상태, 예산 구간이 같은 기준선으로 열립니다."
          signals={forecastEmptySignals}
          stages={forecastEmptyStages}
        />
      )}

      {/* 결과 영역 (isCalculated 이후 노출) */}
      {isCalculated && (
      <div ref={resultRef} className="space-y-8">


      {/* ⬇ 순서: 예측 결과 먼저, 그 다음 캠페인 최적화 가이드 */}

      {/* KPI Cards — 예측 결과 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">예측 결과</h2>
            <p className="text-xs text-gray-400 mt-0.5">{campaignDays}일 기준 · 업종 평균 비교</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {result && applySeasonBoost && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                시즌 보정
              </span>
            )}
            {result?.saturationWarning && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                포화 주의
              </span>
            )}
            {result?.qualityPenaltyPct !== undefined && result.qualityPenaltyPct > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium">
                CPC 압력 +{result.qualityPenaltyPct}%
              </span>
            )}
            <button
              type="button"
              disabled
              aria-label="내보내기 기능은 준비 중입니다"
              title="보고서 저장 기능은 현재 준비 중입니다."
              className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-stone-200 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v7m0 4v.01M5 20h14a2 2 0 001.75-2.97l-7-12a2 2 0 00-3.5 0l-7 12A2 2 0 005 20z" />
              </svg>
              내보내기 준비 중
            </button>
          </div>
        </div>
        {predictionError && !loading && (
          <StatePanel
            variant="error"
            title={predictionErrorPanel.title}
            description={predictionErrorPanel.description}
            ledger={predictionErrorPanel.ledger}
            nextActions={predictionErrorPanel.nextActions}
            className="mb-4 min-h-0 py-4"
          />
        )}
        {result && (
          <section className={`mb-4 rounded-md border p-4 ${evidencePanelTone.shell}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${evidencePanelTone.label}`}>
                  예측 근거
                </p>
                <h3 className="mt-1 text-sm font-bold text-slate-950">이번 예측의 기준 확인</h3>
              </div>
              <span className={`w-fit rounded-md border px-2.5 py-1 text-[11px] font-semibold ${evidencePanelTone.badge}`}>
                {confidenceGateStatus}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: '기간 예산',
                  value: `${campaignDays}일 · 일 ₩${dailyBudget.toLocaleString()}`,
                  detail: '월 기준 예측값을 캠페인 기간으로 환산',
                },
                {
                  label: '예측 방식',
                  value: evidenceBasisLabel,
                  detail: result.predictionMethod === 'regression' ? '설명력과 데이터 수로 근거 점수 산정' : '근거가 충분하지 않을 때 보수 기준 사용',
                },
                {
                  label: '데이터 근거',
                  value: marketSelected
                    ? `${matchedSampleCount.toLocaleString()} / ${marketSampleCount.toLocaleString()}건`
                    : `${matchedSampleCount.toLocaleString()}건`,
                  detail: marketSelected ? '선택 업종 데이터와 매칭 데이터' : '전체 기준으로 표시',
                },
                {
                  label: '구간 상태',
                  value: chartData.length > 0 ? `${chartData.length}개 예산 구간` : '구간 대기',
                  detail: chartData.length > 0 ? '도달 곡선과 비교표 동시 검토' : 'KPI 먼저 검토 후 구간 계산 대기',
                },
              ].map((item) => (
                <div key={item.label} className={`rounded-md border px-3 py-2 ${evidencePanelTone.cell}`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${evidencePanelTone.cellLabel}`}>{item.label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-slate-950">{item.value}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-md border border-stone-200 bg-white/75 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">예상 범위</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">단일 KPI를 확정값처럼 보지 않도록 근거 점수에 맞춘 예상 범위를 함께 표시합니다.</p>
                </div>
                <span className="w-fit rounded-md border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-semibold text-stone-600">
                  예상 범위
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {predictionRangeRows.map((item) => (
                  <div key={item.label} className="rounded-md border border-stone-200 bg-[#fbfaf7] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-950">{item.value}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-md border border-stone-200 bg-white/75 p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">데이터 충분성 판정</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">데이터 매칭, 예측 기준, 예산 구간, 결과 표시 범위를 {truthBandLabel} 기준으로 함께 확인합니다.</p>
                </div>
                <span className={`w-fit rounded-md border px-2.5 py-1 text-[11px] font-semibold ${dataSufficiencyToneClassName}`}>
                  {dataSufficiencyStatus}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {dataSufficiencyLedger.map((item) => (
                  <div key={item.label} className="rounded-md border border-stone-200 bg-[#fbfaf7] px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-950">{item.value}</p>
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            {forecastGuardrails.length > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-white/80 p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">결과 표시 제한</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">근거가 약한 상태에서는 과도한 확정 표현을 막고, 조건 비교 범위로만 사용합니다.</p>
                  </div>
                  <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                    제한 {forecastGuardrails.length}개
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {forecastGuardrails.map((item) => (
                    <div key={item.label} className="rounded-md border border-stone-200 bg-[#fbfaf7] px-3 py-2">
                      <p className="text-xs font-bold text-slate-950">{item.label}</p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {kpiBenchmarkViewModel.cards.map((card) => (
            <KPICard key={card.title} {...card} />
          ))}
        </div>
      </div>

      {/* ── ML 예측 패널 (Python FastAPI) ──────────────────── */}
      {mlBaselineViewModel.shouldRender && (
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5 space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-stone-200 bg-stone-50 px-2 py-1 text-[11px] font-semibold text-stone-700">
                {mlBaselineViewModel.eyebrow}
              </span>
              <h2 className="text-sm font-semibold text-gray-800">{mlBaselineViewModel.title}</h2>
              {mlBaselineViewModel.modelBadge && (
                <span className={mlBaselineViewModel.modelBadge.className}>
                  {mlBaselineViewModel.modelBadge.label}
                </span>
              )}
            </div>
            {mlBaselineViewModel.summaryLabel && (
              <span className="text-[11px] text-gray-400 num">
                {mlBaselineViewModel.summaryLabel}
              </span>
            )}
          </div>

          {/* 로딩 */}
          {mlBaselineViewModel.loading.visible && (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3.5 h-3.5 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
              <span className="text-xs text-teal-700">{mlBaselineViewModel.loading.label}</span>
            </div>
          )}

          {/* 에러 */}
          {mlBaselineViewModel.error.visible && (
            <StatePanel
              variant="error"
              title={mlErrorPanel.title}
              description={mlErrorPanel.description}
              ledger={mlErrorPanel.ledger}
              nextActions={mlErrorPanel.nextActions}
              className="min-h-0 py-4"
            />
          )}

          {/* 보조 기준선 결과 카드 */}
          {mlBaselineViewModel.metrics.visible && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {mlBaselineViewModel.metrics.cards.map((card) => (
                <div key={card.label} className="bg-slate-50 rounded-md p-3 space-y-1">
                  <p className="text-[11px] font-medium text-gray-500">{card.label}</p>
                  <p className="text-base font-bold text-gray-900 num">{card.value}</p>
                  {card.evidence && (
                    <p className="text-[10px] text-gray-400 num">
                      {card.evidence.label}
                      <span className={`ml-1.5 ${card.evidence.indicatorClassName}`}>
                        {card.evidence.indicator}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* AdMate 기준 데이터로 관리되는 모델 상태 안내 */}
          {mlBaselineViewModel.footer.visible && (
            <div className="flex items-center justify-end pt-1 border-t border-gray-50">
              <p className="text-[11px] text-gray-400">
                {mlBaselineViewModel.footer.label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 캠페인 최적화 가이드 */}
      {optimizationGuide.shouldRender && (
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">{optimizationGuide.title}</h2>
          <p className="text-xs text-gray-400 mb-5">{optimizationGuide.description}</p>
          <div className="space-y-4">

            {/* B. 성장 기회 안내 */}
            {optimizationGuide.expansion && (
              <div className={optimizationGuide.expansion.shellClassName}>
                <p className="text-sm font-semibold text-gray-800 mb-2">{optimizationGuide.expansion.title}</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {optimizationGuide.expansion.description}
                </p>
                <div className="flex flex-col gap-2 rounded-md border border-white/70 bg-white px-3 py-2.5 sm:flex-row sm:items-start">
                  <span className={optimizationGuide.expansion.badgeClassName}>{optimizationGuide.expansion.badgeLabel}</span>
                  <p className="min-w-0 break-words text-sm text-gray-700">
                    {optimizationGuide.expansion.actionLead}{' '}
                    <strong className={optimizationGuide.expansion.valueClassName}>{optimizationGuide.expansion.actionValue}</strong>
                    {optimizationGuide.expansion.actionSuffix}
                    {' '}<span className="text-gray-400 text-xs">{optimizationGuide.expansion.actionMuted}</span>
                  </p>
                </div>
              </div>
            )}

            {/* C. 타겟 확장 시나리오 */}
            {scenarioViewModel.visible && (
              <div className="rounded-md p-4 border border-slate-200 bg-slate-50">
                <p className="text-sm font-semibold text-gray-800 mb-1">{scenarioViewModel.title}</p>
                <p className="text-xs text-gray-400 mb-3">{scenarioViewModel.description}</p>
                {scenarioViewModel.loading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-teal-700 rounded-full animate-spin" />
                    {scenarioViewModel.loadingLabel}
                  </div>
                ) : scenarioViewModel.showEmptyError ? (
                  <StatePanel
                    variant="error"
                    title={scenarioErrorPanel.title}
                    description={scenarioErrorPanel.description}
                    ledger={scenarioErrorPanel.ledger}
                    nextActions={scenarioErrorPanel.nextActions}
                    className="min-h-0 py-4"
                  />
                ) : (
                  <div className="space-y-2">
                    {scenarioViewModel.showInlineError && (
                      <StatePanel
                        variant="error"
                        title={scenarioErrorPanel.title}
                        description={scenarioErrorPanel.description}
                        ledger={scenarioErrorPanel.ledger}
                        nextActions={scenarioErrorPanel.nextActions}
                        className="min-h-0 py-4"
                      />
                    )}
                    {/* 현재 타겟 기준 */}
                    {scenarioViewModel.currentTarget && (
                      <div className="flex items-center justify-between rounded-md px-3 py-2.5 bg-teal-50 border border-teal-100">
                        <div>
                          <p className="text-xs font-semibold text-teal-800">{scenarioViewModel.currentTarget.title}</p>
                          <p className="text-[11px] text-teal-600 mt-0.5">{scenarioViewModel.currentTarget.detail}</p>
                        </div>
                        <span className="text-xs font-bold text-teal-700 bg-white px-2 py-1 rounded border border-teal-200">
                          {scenarioViewModel.currentTarget.badgeLabel}
                        </span>
                      </div>
                    )}
                    {scenarioViewModel.rows.map((s) => (
                        <div key={s.label} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${s.shellClassName}`}>
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{s.label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {s.detail}
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${s.statusClassName}`}>
                            {s.statusLabel}
                          </span>
                        </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}


      {/* Budget Range Chart */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800">예산별 도달 곡선</h2>
            <p className="text-xs text-gray-400 mt-0.5">예산 규모에 따른 예상 도달 변화와 한계 효율 신호</p>
          </div>
          {rangeLoading && (
            <div className="w-5 h-5 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
          )}
        </div>
        {rangeError && !rangeLoading && (
          <StatePanel
            variant="error"
            title={rangeErrorPanel.title}
            description={rangeErrorPanel.description}
            ledger={rangeErrorPanel.ledger}
            nextActions={rangeErrorPanel.nextActions}
            className="mb-4 min-h-0 py-4"
          />
        )}
        {rangeTrendBrief.length > 0 && (
          <div className="mb-4 rounded-md border border-stone-200 bg-stone-50/70 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                예산 추세 요약
              </p>
              <span className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                구간 행 기반
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {rangeTrendBrief.map((item) => (
                <div key={item.label} className="rounded-md border border-stone-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-950">{item.value}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}만` : v.toLocaleString()}
                width={64}
              />
              <Tooltip
                formatter={(v) => [Number(v).toLocaleString() + '명', '예상 도달']}
                labelFormatter={(label) => `예산 ${label}`}
              />
              <ReferenceLine
                x={formatSimulatorBudget(budget)}
                stroke="#0f766e"
                strokeDasharray="4 4"
                label={{ value: '현재', position: 'top', fontSize: 11, fill: '#0f766e' }}
              />
              <Line type="monotone" dataKey="reach" stroke="#0f766e" strokeWidth={2.5}
                dot={{ r: 4, fill: '#0f766e' }} activeDot={{ r: 6 }} name="예상 도달" />
            </LineChart>
          </ResponsiveContainer>
        ) : rangeLoading ? (
          <StatePanel
            variant="loading"
            title="예산별 도달 곡선을 계산하고 있습니다"
            description="현재 조건과 예산 범위를 기준으로 비교 데이터를 준비 중입니다."
            className="h-64"
          />
        ) : (
          <PlanningStatePanel
            eyebrow="예산 구간"
            title="예산 곡선은 계산된 구간만 표시합니다"
            description="현재 화면은 빈 차트가 아니라, 예산별 도달 범위를 아직 검토 가능한 근거로 계산하지 못한 상태입니다."
            signals={rangeEmptySignals}
            stages={rangeEmptyStages}
            className="min-h-64"
          />
        )}
      </div>

      {/* Budget Comparison Table */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">예산 구간별 성과 비교</h2>
        {chartData.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2.5 pr-4 text-gray-500 font-medium">예산</th>
                    <th className="text-right py-2.5 pr-4 text-gray-500 font-medium">예상 도달</th>
                    <th className="text-right py-2.5 pr-4 text-gray-500 font-medium">예상 노출</th>
                    <th className="text-right py-2.5 pr-4 text-gray-500 font-medium">예상 클릭</th>
                    <th className="text-right py-2.5 text-gray-500 font-medium">만원당 도달</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row) => {
                    const isSelected = row.budget === budget;
                    return (
                      <tr key={row.monthlyBudget} onClick={() => setBudget(row.budget)}
                        className={`border-b border-gray-50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-teal-50 font-semibold' : 'hover:bg-slate-50'
                        }`}>
                        <td className={`py-2.5 pr-4 ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}>
                          {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-700 mr-2 mb-0.5" />}
                          ₩{row.budget.toLocaleString()}
                        </td>
                        <td className={`py-2.5 pr-4 text-right ${isSelected ? 'text-teal-800' : 'text-slate-700'}`}>
                          {row.reach.toLocaleString()}명
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-700">{row.impressions.toLocaleString()}회</td>
                        <td className="py-2.5 pr-4 text-right text-gray-700">{row.clicks.toLocaleString()}회</td>
                        <td className={`py-2.5 text-right font-mono ${isSelected ? 'text-teal-800' : 'text-slate-700'}`}>
                          {row.reachEfficiency.toLocaleString()}명
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">* 행을 클릭하면 해당 예산이 적용됩니다.</p>
          </>
        ) : rangeLoading ? (
          <StatePanel
            variant="loading"
            title="예산 구간별 비교표를 준비하고 있습니다"
            description="도달 곡선 계산이 끝나면 구간별 도달, 노출, 클릭 추정값이 표시됩니다."
            className="h-44"
          />
        ) : (
          <PlanningStatePanel
            eyebrow="비교표 기준"
            title="비교표는 실제 계산 행이 있을 때만 열립니다"
            description="예산별 도달, 노출, 클릭은 같은 range 결과에서 파생되므로 곡선과 표가 서로 다른 근거를 갖지 않습니다."
            signals={comparisonEmptySignals}
            stages={comparisonEmptyStages}
          />
        )}
      </div>

      {/* Info Note */}
      <div className="rounded-md border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
        <p className="text-[11px] font-semibold text-teal-700">예측 기준 안내</p>
        <p className="mt-1 leading-6">
          <strong>예측 방식:</strong> 예산, CPM, 빈도, 캠페인 목표별 기준값을 함께 적용합니다.
          예산이 커질수록 추가 도달 효율이 완만해지는 흐름도 보수적으로 반영합니다.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-teal-100 bg-white/70 px-3 py-2">
            <p className="text-[11px] font-semibold text-teal-700">입력 준비도</p>
            <p className="mt-0.5 text-xs text-teal-900">{selectedTargetCount > 0 ? `${selectedTargetCount}개 조건 적용` : '전체 기준 입력'}</p>
          </div>
          <div className="rounded-md border border-teal-100 bg-white/70 px-3 py-2">
            <p className="text-[11px] font-semibold text-teal-700">기준선 근거</p>
            <p className="mt-0.5 text-xs text-teal-900">{confidenceDisplay}</p>
          </div>
          <div className="rounded-md border border-teal-100 bg-white/70 px-3 py-2">
            <p className="text-[11px] font-semibold text-teal-700">예산 구간</p>
            <p className="mt-0.5 text-xs text-teal-900">{chartData.length > 0 ? `${chartData.length}개 예산 구간 검토 가능` : '계산된 구간만 표시'}</p>
          </div>
        </div>
      </div>

      </div>
      )}

    </div>
  );
}
