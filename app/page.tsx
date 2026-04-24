'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import KPICard from '@/components/KPICard';
import ConditionTags from '@/components/ConditionTags';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';

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

function formatBudget(v: number) {
  if (v >= 100_000_000) return `${v / 100_000_000}억`;
  return `${v / 10_000}만`;
}

function formatBudgetFull(v: number): string {
  if (v >= 100_000_000) {
    const eok = Math.floor(v / 100_000_000);
    const rem = v % 100_000_000;
    return rem === 0 ? `${eok}억원` : `${eok}억 ${(rem / 10_000).toLocaleString()}만원`;
  }
  return `${(v / 10_000).toLocaleString()}만원`;
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
  }, [result, rangeData, industryLabel, genderLabel, ageLabel, ageRanges, budget]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">성과 예측 시뮬레이터</h1>
        <p className="text-sm text-gray-500 mt-1">캠페인 조건을 입력하면 예상 성과를 실시간으로 예측합니다.</p>
      </div>

      {/* Campaign Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">캠페인 설정</h2>
        <div className="space-y-4">

          {/* 1. 캠페인 예산 */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0 w-24">총 캠페인 예산</label>
            <div className="flex items-center border border-gray-200 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500 bg-white flex-1 max-w-xs">
              <span className="text-sm text-gray-400 mr-1">₩</span>
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
                className="flex-1 text-sm text-gray-800 font-medium focus:outline-none min-w-0"
              />
            </div>
            <span className="text-sm font-bold text-indigo-600">
              {budget >= 100_000_000 ? `${budget / 100_000_000}억` : budget >= 10_000 ? `${(budget / 10_000).toLocaleString()}만원` : `${budget.toLocaleString()}원`}
            </span>
          </div>

          <div className="border-t border-gray-50" />

          {/* 2. 캠페인 기간 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">캠페인 기간</label>
              <span className="text-sm font-bold text-indigo-600">{campaignDays}일</span>
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
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
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
                  className="absolute top-0 text-[11px] font-semibold text-white bg-indigo-600 rounded-md px-1.5 py-0.5 pointer-events-none select-none whitespace-nowrap shadow-sm"
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
                  className="w-full accent-indigo-600 h-1.5 rounded-full cursor-pointer"
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
                      className="absolute text-[11px] text-gray-400 -translate-x-1/2"
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
            <label className="flex items-center gap-2.5 cursor-pointer select-none group">
              <div
                onClick={() => setApplySeasonBoost((v) => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${applySeasonBoost ? 'bg-amber-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${applySeasonBoost ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">성수기/시즌 할증 적용</span>
            </label>
            <div className="group relative">
              <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 text-[11px] flex items-center justify-center cursor-help border border-gray-200">?</span>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-800 text-white text-[11px] rounded-lg px-3 py-2 leading-relaxed opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10 shadow-lg">
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
            <label className="text-sm font-medium text-gray-700">캠페인 목표</label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                ...FIXED_OBJECTIVES,
                ...availableObjectives.filter((o) => !FIXED_OBJECTIVES.includes(o)),
              ].map((obj) => {
                const active = objectives.includes(obj);
                return (
                  <button key={obj} type="button" onClick={() => toggleObjective(obj)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                    {OBJECTIVE_LABELS[obj] ?? obj}
                  </button>
                );
              })}
              {objectives.length > 0 && (
                <button type="button" onClick={() => setObjectives([])}
                  className="px-3 py-1 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                  초기화
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-gray-50" />

          {/* 5. 타겟팅 (성별 + 연령대 묶음) */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700">타겟팅</label>

            {/* 성별 */}
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400 font-medium w-8 shrink-0">성별</p>
              <div className="flex gap-1.5">
                {ALL_GENDERS.map(({ value, label }) => {
                  const active = genders.includes(value);
                  return (
                    <button key={value} type="button" onClick={() => toggleGender(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}>
                      {label}
                    </button>
                  );
                })}
                {genders.length > 0 && (
                  <button type="button" onClick={() => setGenders([])}
                    className="px-2 py-1 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* 연령대 */}
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-gray-400 font-medium w-8 shrink-0">연령</p>
              <div className="flex flex-wrap gap-1.5">
                {ALL_AGE_RANGES.map((age) => {
                  const active = ageRanges.includes(age);
                  return (
                    <button key={age} type="button" onClick={() => toggleAgeRange(age)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                      }`}>
                      {age}
                    </button>
                  );
                })}
                {ageRanges.length > 0 && (
                  <button type="button" onClick={() => setAgeRanges([])}
                    className="px-2 py-1 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                    초기화
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Condition Tags */}
      <div>
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">현재 적용 조건</p>
        <ConditionTags tags={tags} />
      </div>

      {/* 시뮬레이션 START 버튼 */}
      <div className="flex flex-col items-center gap-3 py-2">
        <button
          onClick={handleStartSimulation}
          disabled={loading}
          className="w-full max-w-sm flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base shadow-lg shadow-indigo-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              예측 계산 중...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isCalculated ? '다시 시뮬레이션' : '시뮬레이션 시작'}
            </>
          )}
        </button>
        {!isCalculated && (
          <p className="text-xs text-gray-400">조건을 입력하고 버튼을 눌러주세요</p>
        )}
      </div>

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
                🌙 시즌 할증 반영
              </span>
            )}
            {result?.saturationWarning && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                🚨 포화 구간
              </span>
            )}
            {result?.qualityPenaltyPct !== undefined && result.qualityPenaltyPct > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium">
                ⚠️ CPC 패널티 +{result.qualityPenaltyPct}%
              </span>
            )}
            <button
              onClick={exportToExcel}
              disabled={!result || loading || exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
          <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
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
          const fmtR = (v: number) =>
            v >= 10000 ? `${(v / 10000).toFixed(1)}만명` : `${v.toLocaleString()}명`;
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
                icon="👥" loading={loading} marketLabel={result ? mktLabel(mktReach, fmtR) : undefined}
                diff={hasMarket ? reachDiff : null} lowerBetter={false} />
              <KPICard title="예상 CPM"
                value={result ? `₩${(applySeasonBoost ? Math.round(result.cpm * PEAK_CPM_MULTIPLIER) : result.cpm).toLocaleString()}` : '—'}
                icon="📊" loading={loading} marketLabel={result ? mktLabel(mktCpm) : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpmDiff ?? null) : null} lowerBetter={true} />
              <KPICard title="CPC(전체)"
                value={result ? (result.cpc > 0 ? `₩${result.cpc.toLocaleString()}` : '—') : '—'}
                icon="🖱️" loading={loading} marketLabel={result ? mktLabel(mktCpc) : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpcDiff ?? null) : null} lowerBetter={true} />
              <KPICard title="CPC(링크)"
                value={result ? (result.cpcLink > 0 ? `₩${result.cpcLink.toLocaleString()}` : '—') : '—'}
                icon="🔗" loading={loading}
                marketLabel={result ? mktLabel(mktCpcLink) : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpcLinkDiff ?? null) : null}
                lowerBetter={true} />
              <KPICard title="동영상 3초 조회당 비용"
                value={result ? (result.cpv > 0 ? `₩${result.cpv.toLocaleString()}` : '—') : '—'}
                icon="🎬" loading={loading}
                marketLabel={result ? (hasMarket ? (mktCpv > 0 ? `₩${mktCpv.toLocaleString()}` : '—') : '-') : undefined}
                diff={hasMarket ? (result?.marketAvg?.cpvDiff ?? null) : null}
                lowerBetter={true} />
              <KPICard title="VTR(3s)"
                value={result ? (result.vtr > 0 ? `${result.vtr.toFixed(2)}%` : '—') : '—'}
                icon="▶️" loading={loading}
                marketLabel={result ? (hasMarket ? (mktVtr > 0 ? `${mktVtr.toFixed(2)}%` : '—') : '-') : undefined}
                diff={hasMarket ? (result?.marketAvg?.vtrDiff ?? null) : null} lowerBetter={false} />
            </div>
          );
        })()}
      </div>

      {/* 캠페인 최적화 가이드 */}
      {result && (() => {
        const hasExpansion = expansionPotential?.canExpand === true;
        const hasGuide = hasExpansion || scenarioLoading || scenarios.length > 0;
        if (!hasGuide) return null;
        return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">캠페인 최적화 가이드</h2>
          <p className="text-xs text-gray-400 mb-5">지금 더 투자해도 좋은지, 현재 설정을 유지할지 확인하세요</p>
          <div className="space-y-4">

            {/* B. 성장 기회 안내 */}
            {expansionPotential?.canExpand && (
              <div className="rounded-xl p-4 border-l-4 border-emerald-400 bg-emerald-50">
                <p className="text-sm font-semibold text-gray-800 mb-2">🚀 추가 확보 가능 성과</p>
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  현재 설정한 타겟 시장에 광고가 아직 충분히 노출되지 않아,
                  {' '}<strong className="text-emerald-700">성과를 더 키울 수 있는 여유가 있습니다.</strong>
                </p>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-emerald-200">
                  <span className="text-lg">✅</span>
                  <p className="text-sm text-gray-700">
                    예산을 <strong>20% 늘리면</strong> 약{' '}
                    <strong className="text-emerald-700">{(expansionPotential.additionalReach ?? 0).toLocaleString()}명</strong>의 고객에게 추가로 도달할 수 있습니다.
                    {' '}<span className="text-gray-400 text-xs">(+₩{(expansionPotential.additionalBudget ?? 0).toLocaleString()})</span>
                  </p>
                </div>
              </div>
            )}

            {/* C. 타겟 확장 시나리오 */}
            {(scenarioLoading || scenarios.length > 0) && (
              <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-1">🎯 타겟 범위 확장 시 효율 변화</p>
                <p className="text-xs text-gray-400 mb-3">성별 또는 연령 타겟을 전체로 넓혔을 때 예상 성과를 비교합니다</p>
                {scenarioLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                    시나리오 계산 중...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* 현재 타겟 기준 */}
                    <div className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-indigo-50 border border-indigo-100">
                      <div>
                        <p className="text-xs font-semibold text-indigo-700">현재 타겟 기준</p>
                        <p className="text-[11px] text-indigo-400 mt-0.5">CPM ₩{result.cpm.toLocaleString()} · 도달 {totalReach.toLocaleString()}명</p>
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-white px-2 py-1 rounded border border-indigo-200">기준값</span>
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
                            {overallBetter ? '🚀 효율 개선' : '변화 없음'}
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-800">예산별 도달 곡선</h2>
            <p className="text-xs text-gray-400 mt-0.5">예산 규모에 따른 예상 도달 변화</p>
          </div>
          {rangeLoading && (
            <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          )}
        </div>
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
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{ value: '현재', position: 'top', fontSize: 11, fill: '#6366f1' }}
              />
              <Line type="monotone" dataKey="reach" stroke="#6366f1" strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} name="예상 도달" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">데이터 로딩 중...</div>
        )}
      </div>

      {/* Budget Comparison Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">예산 구간별 성과 비교</h2>
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
                      isSelected ? 'bg-indigo-50 font-semibold' : 'hover:bg-gray-50'
                    }`}>
                    <td className={`py-2.5 pr-4 ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2 mb-0.5" />}
                      ₩{row.budget.toLocaleString()}
                    </td>
                    <td className={`py-2.5 pr-4 text-right ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {row.reach.toLocaleString()}명
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">{row.impressions.toLocaleString()}회</td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">{row.clicks.toLocaleString()}회</td>
                    <td className={`py-2.5 text-right font-mono ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {row.reachEfficiency.toLocaleString()}명
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">* 행을 클릭하면 해당 예산이 적용됩니다.</p>
      </div>

      {/* Info Note */}
      <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
        <strong>예측 방식:</strong> Meta 공식 기반 (예산÷CPM×1000÷빈도) + Diminishing Returns 보정 (β=0.82).
        캠페인 목표별 CPM·빈도를 실제 데이터에서 적용하며, 예산이 클수록 단위당 도달 효율이 감소합니다.
      </div>

      </div>
      )}

    </div>
  );
}
