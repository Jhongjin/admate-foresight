'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import KPICard from '@/components/KPICard';
import ConditionTags from '@/components/ConditionTags';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import StatePanel from '@/components/StatePanel';

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

interface RangePoint {
  budget: number;
  reach: number;
  cpm: number;
  cpc: number;
}

interface MLResult {
  cpm:        number;
  ctr:        number;    // % 단위
  cpc:        number;
  reach:      number;
  r2_cpm:     number;
  r2_ctr:     number;
  cv_r2:      number;
  model_type: string;
  trained_at: string;
  n_samples:  number;
}

function formatBudget(v: number) {
  if (v >= 100_000_000) return `${v / 100_000_000}억`;
  return `${v / 10_000}만`;
}

type PlanningEmptySignal = {
  label: string;
  value: string;
  detail: string;
};

function PlanningEmptyCockpit({
  eyebrow,
  title,
  description,
  signals,
  className = '',
}: {
  eyebrow: string;
  title: string;
  description: string;
  signals: PlanningEmptySignal[];
  className?: string;
}) {
  return (
    <section
      aria-label={title}
      className={`overflow-hidden rounded-md border border-dashed border-stone-300 bg-[#fbfaf6] ${className}`}
    >
      <div className="border-b border-stone-200 bg-white/70 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{eyebrow}</p>
        <h2 className="mt-1 text-sm font-bold text-slate-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="grid gap-0 sm:grid-cols-3">
        {signals.map((signal) => (
          <div key={signal.label} className="border-t border-stone-200 bg-white/45 px-4 py-3 sm:border-r sm:border-t-0 last:border-r-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{signal.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{signal.value}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{signal.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
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
  const [rangeLoading, setRangeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scenarios, setScenarios] = useState<ScenarioResult[]>([]);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  // ── ML 예측 (Python FastAPI) ────────────────────────────
  const [mlResult, setMlResult]   = useState<MLResult | null>(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [mlError, setMlError]     = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scenarioDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/filters')
      .then((r) => r.json())
      .then((f) => {
        setAvailableIndustries(f.industries);
        setAvailableObjectives(f.objectives ?? []);
      })
      .catch(console.error);
  }, []);

  const fetchPrediction = useCallback(async (params: {
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[]; budget: number; monthFrom?: string; monthTo?: string;
  }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      setResult(await res.json());
    } catch (e) { console.error(e); }
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
      const data = await res.json();
      if (!res.ok) { setMlError(data.error ?? 'ML 예측 실패'); setMlResult(null); return; }
      setMlResult(data as MLResult);
    } catch { setMlError('ML 서비스 연결 실패'); setMlResult(null); }
    finally { setMlLoading(false); }
  }, []);

  const fetchRange = useCallback(async (params: {
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[]; budget: number; monthFrom?: string; monthTo?: string;
  }) => {
    setRangeLoading(true);
    try {
      const res = await fetch('/api/predict-range', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      setRangeData(await res.json());
    } catch (e) { console.error(e); }
    finally { setRangeLoading(false); }
  }, []);

  // 총 예산 → 월 환산 예산 (predict API는 월 기준)
  const monthlyBudget = Math.round(budget * (30 / campaignDays));

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
      fetchRange({ industries, genders, ageRanges, objectives, budget });
    }, 400);
  }, [isCalculated, industries, genders, ageRanges, objectives, budget, fetchRange]);

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
    setScenarios([]);
    setIsCalculated(true);
    fetchPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget });
    // 이미 계산된 상태(재시뮬레이션)이면 useEffect가 재실행되지 않으므로 직접 호출
    // 처음 계산 시에는 isCalculated 변화에 의해 useEffect가 fetchRange를 호출하므로 중복 방지
    if (wasCalculated) {
      fetchRange({ industries, genders, ageRanges, objectives, budget });
    }
  }, [isCalculated, industries, genders, ageRanges, objectives, budget, monthlyBudget, fetchPrediction, fetchRange]);

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
      if (!hasFilter) { setScenarios([]); return; }

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
      try {
        const results = await Promise.all(
          expansions.map(e =>
            fetch('/api/predict', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(e.body),
            }).then(r => r.json())
          )
        );
        setScenarios(expansions.map((e, i) => ({
          label: e.label,
          description: e.description,
          cpm: results[i].cpm ?? 0,
          reach: results[i].reach ?? 0,
          vtr: results[i].vtr ?? 0,
          cpc: results[i].cpc ?? 0,
        })));
      } catch (e) { console.error(e); }
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
  const durationFactor = campaignDays / 30;
  const totalReach = result ? Math.round(result.reach * durationFactor) : 0;
  const selectedTargetCount = industries.length + genders.length + ageRanges.length + objectives.length;
  const marketSelected = result?.marketAvg?.industrySelected === true;
  const marketSampleCount = result?.marketAvg?.count ?? 0;
  const matchedSampleCount = result?.matchedCount ?? 0;
  const averageR2 = result
    ? (() => {
        const r2Values = [result.r2Cpm, result.r2Cpc, result.r2Vtr]
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        return r2Values.length > 0
          ? r2Values.reduce((sum, v) => sum + v, 0) / r2Values.length
          : null;
      })()
    : null;
  const confidenceScore = result
    ? Math.min(
        96,
        Math.max(
          42,
          Math.round(
            ((averageR2 ?? 0.62) * 70)
            + (Math.min(matchedSampleCount, 200) / 200) * 20
            + (marketSelected ? 6 : 0)
          )
        )
      )
    : null;
  const readinessTone = loading
    ? 'border-sky-200 bg-sky-50 text-sky-700'
    : !isCalculated
      ? 'border-gray-200 bg-gray-50 text-gray-600'
      : result
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-700';
  const readinessLabel = loading
    ? '계산 중'
    : !isCalculated
      ? '설정 대기'
      : result
        ? '예측 준비'
        : '결과 대기';
  const benchmarkLabel = !isCalculated
    ? '시뮬레이션 후 확인'
    : loading
      ? '벤치마크 확인 중'
      : marketSelected
        ? '업종 벤치마크 사용'
        : '전체 기준 사용';
  const benchmarkDetail = !isCalculated
    ? '업종을 선택하면 평균 비교가 더 선명해집니다.'
    : marketSelected
      ? `업종 표본 ${marketSampleCount.toLocaleString()}건 · 매칭 ${matchedSampleCount.toLocaleString()}건`
      : matchedSampleCount > 0
        ? `매칭 ${matchedSampleCount.toLocaleString()}건 · 업종 평균 미선택`
        : '표시 가능한 벤치마크가 아직 없습니다.';
  const actionHint = loading
    ? '예측, 구간, 모델 비교를 계산하고 있습니다.'
    : !isCalculated
      ? '조건을 정한 뒤 시뮬레이션을 실행하세요.'
      : result
        ? '결과를 검토하고 필요하면 예산/타겟을 조정하세요.'
        : '조건을 넓히거나 다시 실행해 결과를 확인하세요.';
  const confidenceLabel = loading
    ? '계산 중'
    : confidenceScore == null
      ? '실행 전'
      : confidenceScore >= 82
        ? '높음'
        : confidenceScore >= 66
          ? '보통'
          : '주의';
  const confidenceTone = confidenceScore == null
    ? 'text-gray-500'
    : confidenceScore >= 82
      ? 'text-emerald-700'
      : confidenceScore >= 66
        ? 'text-sky-700'
        : 'text-amber-700';
  const nextActionTitle = loading
    ? '예측 계산 중'
    : !isCalculated
      ? '시뮬레이션 시작'
      : result
        ? '플랜 검토'
        : '다시 시뮬레이션';
  const forecastPreview = result
    ? [
        { label: '예상 도달', value: `${totalReach.toLocaleString()}명`, detail: `${campaignDays}일 환산` },
        { label: '예상 CPM', value: `₩${(applySeasonBoost ? Math.round(result.cpm * PEAK_CPM_MULTIPLIER) : result.cpm).toLocaleString()}`, detail: applySeasonBoost ? '시즌 할증 포함' : '현재 조건 기준' },
        { label: '예상 빈도', value: result.frequency > 0 ? result.frequency.toFixed(2) : '-', detail: result.saturationWarning ? '포화 주의' : '노출 압력' },
      ]
    : [
        { label: '예상 도달', value: loading ? '계산 중' : '-', detail: '시뮬레이션 후 표시' },
        { label: '예상 CPM', value: loading ? '계산 중' : '-', detail: '벤치마크 대기' },
        { label: '예상 빈도', value: loading ? '계산 중' : '-', detail: '노출 압력 대기' },
      ];
  const planBrief = [
    { label: '예산', value: `₩${budget.toLocaleString()}`, detail: `일 평균 ₩${dailyBudget.toLocaleString()}` },
    { label: '기간', value: durationLabel, detail: `월 환산 ₩${monthlyBudget.toLocaleString()}` },
    { label: '목표', value: objectiveLabel, detail: objectives.length === 0 ? '목표 전체 기준' : `${objectives.length}개 목표` },
    { label: '타겟', value: `${industryLabel} · ${ageLabel}`, detail: `성별 ${genderLabel}` },
  ];
  const readinessChecks = [
    { label: '플랜 입력', value: selectedTargetCount > 0 ? `${selectedTargetCount}개 조건` : '전체 기준' },
    { label: '벤치마크', value: benchmarkLabel },
    { label: '신뢰도', value: confidenceScore == null ? confidenceLabel : `${confidenceScore}% · ${confidenceLabel}` },
  ];
  const planningBasis = [
    { label: 'Benchmark window', value: '최근 6개월', detail: benchmarkLabel },
    { label: 'Currency basis', value: 'KRW · Net', detail: 'VAT/수수료 제외 매체비 기준' },
    { label: 'Adjustment rule', value: '보수적 보정', detail: '성수기·포화·CPC 압력은 별도 배지로 표시' },
    {
      label: 'Sample match',
      value: marketSelected ? `${matchedSampleCount}/${marketSampleCount || '-'}` : `${marketSampleCount || '-'}건`,
      detail: marketSelected ? '선택 업종 매칭 표본' : '업종 전체 벤치마크',
    },
    { label: 'Active filters', value: `${selectedTargetCount}개`, detail: `${objectiveLabel} · ${genderLabel} · ${ageLabel}` },
    { label: 'Planning use', value: 'Scenario only', detail: '확정 성과가 아닌 조건별 예상 범위' },
  ];
  const cockpitTimeline = [
    { label: 'Brief', active: true },
    { label: 'Forecast', active: isCalculated || loading },
    { label: 'Optimize', active: Boolean(result) },
  ];

  // ── 성과 확장 잠재력 ────────────────────────────────────────
  // 조건: 빈도 < 1.5 AND 현재도달 / rangeData 최대도달 ≤ 30%
  const expansionPotential = useMemo(() => {
    if (!result) return null;
    const freq = result.frequency;
    const maxReach = rangeData.length > 0 ? rangeData[rangeData.length - 1].reach : 0;
    const reachRate = maxReach > 0 ? totalReach / maxReach : 1;
    const canExpand = freq < 1.5 && reachRate <= 0.3;

    if (!canExpand) return { canExpand: false, frequency: freq, reachRate };

    // 20% 증액 시 추가 도달 계산
    const b120 = monthlyBudget * 1.2;
    const lower = [...rangeData].reverse().find(d => d.budget <= b120);
    const upper = rangeData.find(d => d.budget > b120);
    let reach120 = 0;
    if (lower && upper) {
      const ratio = (b120 - lower.budget) / (upper.budget - lower.budget);
      reach120 = lower.reach + ratio * (upper.reach - lower.reach);
    } else if (lower) {
      reach120 = lower.reach * Math.pow(b120 / lower.budget, 0.82);
    }
    const additionalReach = Math.max(0, Math.round((reach120 - result.reach) * durationFactor));
    return { canExpand: true, frequency: freq, reachRate, additionalReach, additionalBudget: Math.round(budget * 0.2) };
  }, [result, rangeData, totalReach, monthlyBudget, budget, durationFactor]);

  // Chart data (range chart는 월 기준 유지)
  const chartData = rangeData.map((p) => ({
    ...p,
    label: formatBudget(p.budget),
    impressions: p.cpm > 0 ? Math.round(p.budget / p.cpm * 1000) : 0,
    clicks: p.cpc > 0 ? Math.round(p.budget / p.cpc) : 0,
    reachEfficiency: p.reach > 0 ? Math.round(p.reach / (p.budget / 10_000)) : 0,
  }));
  const rangeTrendBrief = chartData.length > 0
    ? (() => {
        const first = chartData[0];
        const last = chartData[chartData.length - 1];
        const selected = chartData.find((row) => row.budget === budget)
          ?? chartData.reduce((closest, row) => (
            Math.abs(row.budget - budget) < Math.abs(closest.budget - budget) ? row : closest
          ), first);
        const reachLiftPct = first.reach > 0
          ? Math.round(((last.reach - first.reach) / first.reach) * 100)
          : null;
        const efficiencySignal = last.reachEfficiency < first.reachEfficiency
          ? '효율 체감'
          : last.reachEfficiency > first.reachEfficiency
            ? '효율 개선'
            : '효율 유지';

        return [
          {
            label: 'Range span',
            value: `${first.label} → ${last.label}`,
            detail: reachLiftPct == null ? '도달 증분 계산 대기' : `도달 +${reachLiftPct.toLocaleString()}%`,
          },
          {
            label: 'Selected budget',
            value: `₩${selected.budget.toLocaleString()}`,
            detail: `만원당 ${selected.reachEfficiency.toLocaleString()}명 도달`,
          },
          {
            label: 'Marginal signal',
            value: efficiencySignal,
            detail: `구간 끝 CPM ₩${last.cpm.toLocaleString()}`,
          },
        ];
      })()
    : [];
  const decisionGateRows = [
    {
      label: 'Benchmark scope',
      status: marketSelected ? 'Industry matched' : isCalculated ? 'General baseline' : 'Awaiting run',
      detail: marketSelected
        ? `${marketSampleCount.toLocaleString()}건 표본`
        : isCalculated
          ? '업종 평균 미선택'
          : '시뮬레이션 후 확정',
      tone: marketSelected ? 'ok' : isCalculated ? 'watch' : 'idle',
    },
    {
      label: 'Forecast confidence',
      status: confidenceScore == null ? 'Not scored' : confidenceScore >= 66 ? 'Reviewable' : 'Needs basis',
      detail: confidenceScore == null ? '계산 전' : `${confidenceScore}% · ${confidenceLabel}`,
      tone: confidenceScore == null ? 'idle' : confidenceScore >= 66 ? 'ok' : 'watch',
    },
    {
      label: 'Delivery pressure',
      status: result?.saturationWarning ? 'Saturation watch' : result ? 'In range' : 'Not measured',
      detail: result ? `빈도 ${result.frequency > 0 ? result.frequency.toFixed(2) : '-'}` : '결과 대기',
      tone: result?.saturationWarning ? 'risk' : result ? 'ok' : 'idle',
    },
    {
      label: 'Scenario range',
      status: chartData.length > 0 ? `${chartData.length} budget rows` : rangeLoading ? 'Calculating' : 'No range yet',
      detail: chartData.length > 0 ? '곡선/표 동시 검토 가능' : '예산 구간 대기',
      tone: chartData.length > 0 ? 'ok' : rangeLoading ? 'watch' : 'idle',
    },
  ];
  const forecastEmptySignals = [
    {
      label: 'Benchmark basis',
      value: 'Recent 6M · KRW Net',
      detail: '시뮬레이션 후 업종/목표 필터와 표본 매칭을 공개합니다.',
    },
    {
      label: 'Planner input',
      value: selectedTargetCount > 0 ? `${selectedTargetCount}개 조건 선택` : '전체 기준 대기',
      detail: `${durationLabel} · 총 예산 ₩${budget.toLocaleString()}`,
    },
    {
      label: 'Forecast output',
      value: 'No synthetic result',
      detail: '계산 전에는 KPI, 도달 곡선, 비교표를 임의로 채우지 않습니다.',
    },
  ];
  const rangeEmptySignals = [
    {
      label: 'Range status',
      value: isCalculated ? 'No curve rows' : 'Run required',
      detail: '계산된 예산 구간이 있을 때만 곡선을 표시합니다.',
    },
    {
      label: 'Current budget',
      value: `₩${budget.toLocaleString()}`,
      detail: `월 환산 ₩${monthlyBudget.toLocaleString()} · ${durationLabel}`,
    },
    {
      label: 'Planner action',
      value: isCalculated ? '조건 재검토' : '시뮬레이션 시작',
      detail: isCalculated ? '필터를 넓히거나 다시 실행해 범위를 확인하세요.' : '좌측 조건 확인 후 예측을 실행하세요.',
    },
  ];
  const comparisonEmptySignals = [
    {
      label: 'Table policy',
      value: 'Calculated rows only',
      detail: '도달, 노출, 클릭은 예산 구간 계산 결과가 있을 때만 노출합니다.',
    },
    {
      label: 'Benchmark safety',
      value: 'No fake fill',
      detail: '빈 소스를 벤치마크처럼 표시하지 않습니다.',
    },
    {
      label: 'Next check',
      value: chartData.length > 0 ? 'Rows available' : 'Range pending',
      detail: '곡선이 생성되면 동일한 데이터로 비교표가 채워집니다.',
    },
  ];

  const exportToExcel = useCallback(async () => {
    if (!result) return;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          rangeData,
          conditions: {
            industry: industryLabel,
            gender: genderLabel,
            age: ageLabel,
            budget,
          },
          dateStr,
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AdPlanner_시뮬레이션_${dateStr}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Excel 내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  }, [result, rangeData, industryLabel, genderLabel, ageLabel, budget]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm">
        <div className="border-b border-stone-200 bg-[#f6f8f1] px-5 py-4 text-slate-950 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${readinessTone}`}>
                  {readinessLabel}
                </span>
                <span className="inline-flex rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">
                  Market benchmark desk
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Foresight Forecast Desk</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                최근 성과 표본을 기준선으로 삼아 예산, 기간, 타겟 조건의 집행 압력을 검토합니다.
              </p>
            </div>
            <div className="grid min-w-0 grid-cols-3 gap-1 rounded-md border border-stone-300 bg-white p-1 shadow-sm">
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

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <div className="space-y-5 p-5 sm:p-6">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-950">Plan Brief</h2>
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
                  <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-900">Benchmark Basis</h3>
                  <span className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">planning evidence</span>
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
                  <h2 className="text-sm font-semibold text-slate-950">계획 설정</h2>
                  <p className="text-xs text-slate-500">예산, 기간, 타겟 조건을 조정합니다.</p>
                </div>
              </div>
              <div className="space-y-4">

          {/* 1. 캠페인 예산 */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <label className="text-sm font-medium text-slate-700 sm:w-24 sm:shrink-0">총 캠페인 예산</label>
            <div className="flex w-full min-w-0 items-center border border-slate-200 rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-teal-700 bg-white sm:max-w-xs sm:flex-1">
              <span className="text-sm text-slate-400 mr-1">₩</span>
              <input
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
                { label: '1주일 이하', days: null },
                { label: '1주일',     days: 7 },
                { label: '2주일',     days: 14 },
                { label: '1개월',     days: 30 },
                { label: '2개월',     days: 60 },
                { label: '3개월',     days: 90 },
                { label: '6개월',     days: 180 },
                { label: '1년',       days: 365 },
              ].map(({ label, days }) => {
                const active = days !== null ? campaignDays === days : campaignDays < 7;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => days !== null && setCampaignDays(days)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                    } ${days === null ? 'cursor-default' : ''}`}
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

          <aside className="border-t border-slate-200 bg-[#f7faf8] p-5 sm:p-6 xl:border-l xl:border-t-0">
            <div className="space-y-4">
              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Forecast Preview</h2>
                    <p className="mt-1 text-xs text-slate-500">실행 전후 핵심 수치를 같은 자리에서 비교합니다.</p>
                  </div>
                  {loading && <div className="h-4 w-4 rounded-full border-2 border-sky-100 border-t-sky-600 animate-spin" />}
                </div>
                <div className="mt-4 grid gap-2">
                  {forecastPreview.map((item) => (
                    <div key={item.label} className="rounded-md border border-slate-200 bg-[#f7faf8] px-3 py-3">
                      <p className="text-[11px] font-semibold text-slate-500">{item.label}</p>
                      <p className="mt-1 text-xl font-bold text-slate-950 num">{item.value}</p>
                      <p className="mt-1 text-[11px] text-slate-500">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-md border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-950">Readiness</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{benchmarkDetail}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold num ${confidenceTone}`}>
                      {confidenceScore == null ? '-' : confidenceScore}
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">confidence</p>
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">Media Plan Gate</p>
                    <h2 className="mt-1 text-sm font-semibold text-slate-950">집행 전 검토 신호</h2>
                  </div>
                  <span className="rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-500">
                    planner control
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
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">Next Decision</p>
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
        <PlanningEmptyCockpit
          eyebrow="Forecast Cockpit Standby"
          title="벤치마크 플랜을 계산하기 전입니다"
          description="조건을 확인하고 시뮬레이션을 실행하면 최근 6개월 기준, 필터, 신뢰도, 예산 구간이 같은 기준선으로 열립니다."
          signals={forecastEmptySignals}
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
                Season boost
              </span>
            )}
            {result?.saturationWarning && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                Saturation watch
              </span>
            )}
            {result?.qualityPenaltyPct !== undefined && result.qualityPenaltyPct > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium">
                CPC penalty +{result.qualityPenaltyPct}%
              </span>
            )}
            <button
              onClick={exportToExcel}
              disabled={!result || loading || exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 rounded-md hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {exporting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {exporting ? '생성 중...' : 'Excel 내보내기'}
            </button>
          </div>
        </div>
        {result && (
          <div className="mb-4 px-4 py-3 bg-teal-50 border border-teal-100 rounded-md text-sm text-teal-800">
            선택하신 기간은 총 <strong>{campaignDays}일</strong>이며,
            일 평균 <strong>₩{dailyBudget.toLocaleString()}</strong>의 예산이 투입될 예정입니다.
          </div>
        )}
        {(() => {
          const hasMarket = result?.marketAvg?.industrySelected === true;
          const mktCpm     = result?.marketAvg?.cpm     ?? 0;
          const mktCpc     = result?.marketAvg?.cpc     ?? 0;
          const mktCpcLink = result?.marketAvg?.cpcLink ?? 0;
          const mktCpv     = result?.marketAvg?.cpv     ?? 0;
          const mktVtr     = result?.marketAvg?.vtr     ?? 0;
          const mktReach = hasMarket && mktCpm > 0 && result!.cpm > 0
            ? Math.round(totalReach * result!.cpm / mktCpm) : 0;
          const fmtR = (v: number) => `${v.toLocaleString()} 명`;
          const reachDiff = hasMarket && mktReach > 0 && totalReach > 0
            ? Math.round(((totalReach - mktReach) / mktReach) * 100 * 10) / 10 : null;
          const mktLabel = (val: string | number, fmt?: (v: number) => string) => {
            if (!hasMarket) return '-';
            const n = typeof val === 'number' ? val : 0;
            if (n <= 0) return '—';
            return fmt ? fmt(n) : `₩${n.toLocaleString()}`;
          };
          return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard title={`예상 도달 (${campaignDays}일)`} value={result ? fmtR(totalReach) : '—'}
                icon="Reach" loading={loading} marketLabel={result ? mktLabel(mktReach, fmtR) : undefined}
                diff={hasMarket ? reachDiff : null} lowerBetter={false} />
              <KPICard title="예상 CPM"
                value={result ? `₩${(applySeasonBoost ? Math.round(result.cpm * PEAK_CPM_MULTIPLIER) : result.cpm).toLocaleString()}` : '—'}
                icon="CPM" loading={loading} marketLabel={result ? mktLabel(mktCpm) : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpmDiff ?? null) : null} lowerBetter={true} />
              <KPICard title="CPC(전체)"
                value={result ? (result.cpc > 0 ? `₩${result.cpc.toLocaleString()}` : '—') : '—'}
                icon="CPC" loading={loading} marketLabel={result ? mktLabel(mktCpc) : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpcDiff ?? null) : null} lowerBetter={true} />
              <KPICard title="CPC(링크)"
                value={result ? (result.cpcLink > 0 ? `₩${result.cpcLink.toLocaleString()}` : '—') : '—'}
                icon="Link" loading={loading}
                marketLabel={result ? mktLabel(mktCpcLink) : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpcLinkDiff ?? null) : null}
                lowerBetter={true} />
              <KPICard title="동영상 3초 조회당 비용"
                value={result ? (result.cpv > 0 ? `₩${result.cpv.toLocaleString()}` : '—') : '—'}
                icon="View" loading={loading}
                marketLabel={result ? (hasMarket ? (mktCpv > 0 ? `₩${mktCpv.toLocaleString()}` : '—') : '-') : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpvDiff ?? null) : null}
                lowerBetter={true} />
              <KPICard title="VTR(3s)"
                value={result ? (result.vtr > 0 ? `${result.vtr.toFixed(2)}%` : '—') : '—'}
                icon="VTR" loading={loading}
                marketLabel={result ? (hasMarket ? (mktVtr > 0 ? `${mktVtr.toFixed(2)}%` : '—') : '-') : undefined}
                diff={hasMarket ? (result?.marketAvg?.vtrDiff ?? null) : null} lowerBetter={false} />
            </div>
          );
        })()}
      </div>

      {/* ── ML 예측 패널 (Python FastAPI) ──────────────────── */}
      {isCalculated && (mlLoading || mlResult || mlError) && (
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-5 space-y-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">ML</span>
              <h2 className="text-sm font-semibold text-gray-800">ML 모델 예측</h2>
              {mlResult && (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  mlResult.model_type === 'random_forest'
                    ? 'bg-teal-50 text-teal-700'
                    : 'bg-sky-50 text-sky-700'
                }`}>
                  {mlResult.model_type === 'random_forest' ? 'Random Forest' : 'Ridge Regression'}
                </span>
              )}
            </div>
            {mlResult && (
              <span className="text-[11px] text-gray-400 num">
                학습 샘플 {mlResult.n_samples.toLocaleString()}건 · CV R²={mlResult.cv_r2.toFixed(3)}
              </span>
            )}
          </div>

          {/* 로딩 */}
          {mlLoading && (
            <div className="flex items-center gap-2 py-2">
              <div className="w-3.5 h-3.5 border-2 border-teal-200 border-t-teal-700 rounded-full animate-spin" />
              <span className="text-xs text-teal-700">Python ML 모델 예측 중...</span>
            </div>
          )}

          {/* 에러 */}
          {!mlLoading && mlError && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{mlError}</p>
          )}

          {/* ML 결과 카드 */}
          {!mlLoading && mlResult && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'CPM', value: `₩${mlResult.cpm.toLocaleString()}`, r2: mlResult.r2_cpm, lowerBetter: true },
                { label: 'CTR', value: `${mlResult.ctr.toFixed(2)}%`,       r2: mlResult.r2_ctr, lowerBetter: false },
                { label: 'CPC', value: `₩${mlResult.cpc.toLocaleString()}`, r2: null, lowerBetter: true },
                { label: '예상 도달', value: `${mlResult.reach.toLocaleString()}명`, r2: null, lowerBetter: false },
              ].map(({ label, value, r2 }) => (
                <div key={label} className="bg-slate-50 rounded-md p-3 space-y-1">
                  <p className="text-[11px] font-medium text-gray-500">{label}</p>
                  <p className="text-base font-bold text-gray-900 num">{value}</p>
                  {r2 != null && (
                    <p className="text-[10px] text-gray-400 num">
                      R²={r2.toFixed(3)}
                      <span className={`ml-1.5 ${r2 >= 0.7 ? 'text-emerald-500' : r2 >= 0.5 ? 'text-amber-500' : 'text-red-400'}`}>
                        {r2 >= 0.7 ? '●' : r2 >= 0.5 ? '◐' : '○'}
                      </span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 운영 파이프라인에서 관리되는 모델 상태 안내 */}
          {!mlLoading && (
            <div className="flex items-center justify-end pt-1 border-t border-gray-50">
              <p className="text-[11px] text-gray-400">
                모델 기준 데이터는 운영 파이프라인에서 관리됩니다.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 캠페인 최적화 가이드 */}
      {result && (() => {
        const hasExpansion = expansionPotential?.canExpand === true;
        const hasGuide = hasExpansion || scenarioLoading || scenarios.length > 0;
        if (!hasGuide) return null;
        return (
        <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">캠페인 최적화 가이드</h2>
          <p className="text-xs text-gray-400 mb-5">지금 더 투자해도 좋은지, 현재 설정을 유지할지 확인하세요</p>
          <div className="space-y-4">

            {/* B. 성장 기회 안내 */}
            {expansionPotential?.canExpand && (
              <div className="rounded-md p-4 border-l-4 border-emerald-400 bg-emerald-50">
                <p className="text-sm font-semibold text-gray-800 mb-2">추가 확보 가능 성과</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  현재 설정한 타겟 시장에 광고가 아직 충분히 노출되지 않아,
                  {' '}<strong className="text-emerald-700">성과를 더 키울 수 있는 여유가 있습니다.</strong>
                </p>
                <div className="flex items-center gap-2 bg-white rounded-md px-3 py-2.5 border border-emerald-200">
                  <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">+20%</span>
                  <p className="text-sm text-gray-700">
                    예산을 <strong>20% 늘리면</strong> 약{' '}
                    <strong className="text-emerald-700">{(expansionPotential.additionalReach ?? 0).toLocaleString()} 명</strong>의 고객에게 추가로 도달할 수 있습니다.
                    {' '}<span className="text-gray-400 text-xs">(+₩{(expansionPotential.additionalBudget ?? 0).toLocaleString()})</span>
                  </p>
                </div>
              </div>
            )}

            {/* C. 타겟 확장 시나리오 */}
            {(scenarioLoading || scenarios.length > 0) && (
              <div className="rounded-md p-4 border border-slate-200 bg-slate-50">
                <p className="text-sm font-semibold text-gray-800 mb-1">타겟 범위 확장 시 효율 변화</p>
                <p className="text-xs text-gray-400 mb-3">성별 또는 연령 타겟을 전체로 넓혔을 때 예상 성과를 비교합니다</p>
                {scenarioLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-teal-700 rounded-full animate-spin" />
                    시나리오 계산 중...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 현재 타겟 기준 */}
                    <div className="flex items-center justify-between rounded-md px-3 py-2.5 bg-teal-50 border border-teal-100">
                      <div>
                        <p className="text-xs font-semibold text-teal-800">현재 타겟 기준</p>
                        <p className="text-[11px] text-teal-600 mt-0.5">CPM ₩{result.cpm.toLocaleString()} · 도달 {totalReach.toLocaleString()}명</p>
                      </div>
                      <span className="text-xs font-bold text-teal-700 bg-white px-2 py-1 rounded border border-teal-200">기준값</span>
                    </div>
                    {scenarios.map((s) => {
                      const cpmBetter = s.cpm > 0 && s.cpm < result.cpm;
                      const reachMore = s.reach * durationFactor > totalReach;
                      const overallBetter = cpmBetter || reachMore;
                      return (
                        <div key={s.label} className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                          overallBetter ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100'
                        }`}>
                          <div>
                            <p className="text-xs font-semibold text-gray-700">{s.label}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              CPM ₩{s.cpm.toLocaleString()} · 도달 {Math.round(s.reach * durationFactor).toLocaleString()}명
                            </p>
                          </div>
                          <span className={`text-xs font-bold px-2 py-1 rounded border ${
                            overallBetter
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {overallBetter ? '효율 개선' : '변화 없음'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      );})()}


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
        {rangeTrendBrief.length > 0 && (
          <div className="mb-4 rounded-md border border-stone-200 bg-stone-50/70 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">
                Planning Trend Brief
              </p>
              <span className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                derived from range rows
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
                x={formatBudget(budget)}
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
          <PlanningEmptyCockpit
            eyebrow="Range Planner"
            title="예산 곡선은 계산된 구간만 표시합니다"
            description="현재 화면은 빈 차트가 아니라, 예산별 도달 범위를 아직 신뢰할 수 있게 계산하지 못한 상태입니다."
            signals={rangeEmptySignals}
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
                      <tr key={row.budget} onClick={() => setBudget(row.budget)}
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
          <PlanningEmptyCockpit
            eyebrow="Benchmark Table Guard"
            title="비교표는 실제 계산 행이 있을 때만 열립니다"
            description="예산별 도달, 노출, 클릭은 같은 range 결과에서 파생되므로 곡선과 표가 서로 다른 근거를 갖지 않습니다."
            signals={comparisonEmptySignals}
          />
        )}
      </div>

      {/* Info Note */}
      <div className="bg-teal-50 rounded-md p-4 text-sm text-teal-800">
        <strong>예측 방식:</strong> Meta 공식 기반 (예산÷CPM×1000÷빈도) + Diminishing Returns 보정 (β=0.82).
        캠페인 목표별 CPM·빈도를 실제 데이터에서 적용하며, 예산이 클수록 단위당 도달 효율이 감소합니다.
      </div>

      </div>
      )}

    </div>
  );
}
