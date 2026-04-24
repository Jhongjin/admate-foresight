'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import KPICard from '@/components/KPICard';
import DateRangePicker, { calcCampaignDays, hasPeakMonth } from '@/components/DateRangePicker';
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
  cpm: number; cpc: number; vtr: number; count: number;
  score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cpmDiff: number; cpcDiff: number; vtrDiff: number;
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

  // 캠페인 기간 (날짜 범위)
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  });
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 6); return d;
  });
  const campaignDays = calcCampaignDays(startDate, endDate);
  const isPeakSeason = hasPeakMonth(startDate, endDate);
  const PEAK_CPM_MULTIPLIER = 1.15;
  const monthFrom = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
  const monthTo = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

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
      fetchPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget, monthFrom, monthTo });
    }, 300);
  }, [isCalculated, industries, genders, ageRanges, objectives, monthlyBudget, monthFrom, monthTo, fetchPrediction]);

  useEffect(() => {
    if (!isCalculated) return;
    if (rangeDebounceRef.current) clearTimeout(rangeDebounceRef.current);
    rangeDebounceRef.current = setTimeout(() => {
      fetchRange({ industries, genders, ageRanges, objectives, budget });
    }, 400);
  }, [isCalculated, industries, genders, ageRanges, objectives, budget, fetchRange]);

  // 버튼 클릭 후 결과 영역으로 자동 스크롤 (isCalculated 최초 true 시)
  useEffect(() => {
    if (isCalculated) {
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, [isCalculated]);

  // 시뮬레이션 시작 핸들러 — 이전 결과 초기화 후 즉시 fetch
  const handleStartSimulation = useCallback(() => {
    const wasCalculated = isCalculated;
    setResult(null);
    setRangeData([]);
    setScenarios([]);
    setIsCalculated(true);
    fetchPrediction({ industries, genders, ageRanges, objectives, budget: monthlyBudget, monthFrom, monthTo });
    // 이미 계산된 상태(재시뮬레이션)이면 useEffect가 재실행되지 않으므로 직접 호출
    // 처음 계산 시에는 isCalculated 변화에 의해 useEffect가 fetchRange를 호출하므로 중복 방지
    if (wasCalculated) {
      fetchRange({ industries, genders, ageRanges, objectives, budget });
    }
  }, [isCalculated, industries, genders, ageRanges, objectives, budget, monthlyBudget, monthFrom, monthTo, fetchPrediction, fetchRange]);

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
      if (industries.length > 0) {
        expansions.push({
          label: '업종 전체 확장',
          description: `${industries.join(', ')} → 전체`,
          body: { industries: [], genders, ageRanges, objectives, budget: monthlyBudget },
        });
      }

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

  const durationLabel = `${startDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} ~ ${endDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} (${campaignDays}일)`;

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
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(s, e) => { setStartDate(s); setEndDate(e); }}
          />

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

      {/* 예상 도달 규모 */}
      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">예상 도달 규모</h2>
          <p className="text-xs text-gray-400 mb-5">{campaignDays}일 캠페인 기준 예상 볼륨 지표</p>

          {/* 주요 도달 수치 */}
          <div className="flex flex-col items-center py-5 mb-5 bg-indigo-50 rounded-2xl">
            <p className="text-xs text-indigo-500 font-medium mb-1">예상 순 도달</p>
            <p className="text-4xl font-extrabold text-indigo-700 tracking-tight">
              {totalReach >= 10000
                ? `${(totalReach / 10000).toFixed(1)}만`
                : totalReach.toLocaleString()}
            </p>
            <p className="text-sm text-indigo-400 mt-1">명 ({campaignDays}일 기준)</p>
          </div>

          {/* 지원 지표 4개 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-1">예상 노출</p>
              <p className="text-base font-bold text-gray-900">
                {result.frequency > 0
                  ? (() => {
                      const imp = Math.round(totalReach * result.frequency);
                      return imp >= 10000 ? `${(imp / 10000).toFixed(1)}만` : imp.toLocaleString();
                    })()
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">회</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-1">예상 빈도</p>
              <p className="text-base font-bold text-gray-900">{result.frequency.toFixed(1)}</p>
              <p className="text-xs text-gray-400 mt-0.5">회 / 1인당</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-1">예상 CPM</p>
              <p className="text-base font-bold text-gray-900">
                ₩{(isPeakSeason ? Math.round(result.cpm * PEAK_CPM_MULTIPLIER) : result.cpm).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{isPeakSeason ? '성수기 반영' : '1,000회 노출당'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3.5">
              <p className="text-xs text-gray-500 mb-1">일 평균 예산</p>
              <p className="text-base font-bold text-gray-900">₩{dailyBudget.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">총 ₩{budget.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* 광고 성과 예측 스코어 */}
      {result?.marketAvg && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-base font-semibold text-gray-800">광고 성과 예측 스코어</h2>
            <div className="flex gap-2 flex-wrap justify-end">
              {result.seasonalityMultiplier && result.seasonalityMultiplier > 1 && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                  🌙 {result.seasonalityReason} · CPM {Math.round((result.seasonalityMultiplier - 1) * 100)}% 할증
                </span>
              )}
              {result.saturationWarning && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium">
                  🚨 포화 구간 CPM 할증 적용
                </span>
              )}
              {result.qualityPenaltyPct !== undefined && result.qualityPenaltyPct > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium">
                  ⚠️ CPC 패널티 +{result.qualityPenaltyPct}%
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-5">전체 업종 평균 대비 예측 성과 점수입니다</p>

          {result.marketAvg.industrySelected ? (
            <>
              {/* 종합 점수 */}
              <div className="flex items-center gap-5 mb-6">
                <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-indigo-100 bg-indigo-50 shrink-0">
                  <span className="text-3xl font-extrabold text-indigo-600">{result.marketAvg.score}</span>
                  <span className="text-xs text-indigo-400 font-semibold">점</span>
                </div>
                <div className="flex-1">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        result.marketAvg.score >= 65 ? 'bg-emerald-500' : result.marketAvg.score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${result.marketAvg.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    {result.marketAvg.score >= 80 ? '업종 최상위 효율 구간입니다.'
                      : result.marketAvg.score >= 65 ? '업종 평균보다 우수한 효율입니다.'
                      : result.marketAvg.score >= 50 ? '업종 평균 수준입니다.'
                      : result.marketAvg.score >= 35 ? '일부 지표가 업종 평균보다 낮습니다.'
                      : '주요 지표가 업종 평균을 하회합니다.'}
                  </p>
                  {result.qualityIndex !== undefined && (
                    <p className="text-xs text-gray-400 mt-1">
                      품질 지수 <strong className={`font-semibold ${result.qualityIndex >= 60 ? 'text-emerald-600' : result.qualityIndex >= 40 ? 'text-amber-600' : 'text-red-500'}`}>{result.qualityIndex}점</strong>
                    </p>
                  )}
                </div>
              </div>

              {/* 주요 효율 지표 요약 */}
              <p className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">주요 효율 지표 요약</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'CPM', predicted: result.cpm, market: result.marketAvg.cpm, diff: result.marketAvg.cpmDiff, lowerBetter: true, fmt: (v: number) => `₩${v.toLocaleString()}` },
                  { label: 'CPC', predicted: result.cpc, market: result.marketAvg.cpc, diff: result.marketAvg.cpcDiff, lowerBetter: true, fmt: (v: number) => v > 0 ? `₩${v.toLocaleString()}` : '—' },
                  { label: 'VTR', predicted: result.vtr, market: result.marketAvg.vtr, diff: result.marketAvg.vtrDiff, lowerBetter: false, fmt: (v: number) => v > 0 ? `${v.toFixed(2)}%` : '—' },
                ].map(({ label, predicted, market, diff, lowerBetter, fmt }) => {
                  const isBetter = lowerBetter ? diff < 0 : diff > 0;
                  const isNeutral = Math.abs(diff) < 2;
                  return (
                    <div key={label} className="rounded-xl p-3.5 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-1">{label}</p>
                      <p className="text-base font-bold text-gray-900">{fmt(predicted)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">업종 평균 {fmt(market)}</p>
                      {market > 0 && (
                        <span className={`inline-block mt-1.5 text-xs font-semibold px-1.5 py-0.5 rounded ${
                          isNeutral ? 'bg-gray-100 text-gray-500'
                            : isBetter ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-red-50 text-red-500'
                        }`}>
                          {isNeutral ? '평균' : isBetter ? `▼ ${Math.abs(diff)}%` : `▲ ${Math.abs(diff)}%`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* 업종 미선택 시 N/A */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-gray-100 bg-gray-50 mb-4">
                <span className="text-3xl font-extrabold text-gray-300">-</span>
                <span className="text-xs text-gray-300 font-semibold">점</span>
              </div>
              <p className="text-sm font-medium text-gray-500">업종을 선택하면 정확한 스코어가 산출됩니다</p>
              <p className="text-xs text-gray-400 mt-1">업종 평균 CPM·CPC·VTR과 현재 예측값을 비교합니다</p>
            </div>
          )}
        </div>
      )}

      {/* 캠페인 최적화 가이드 */}
      {result && ((result.insights?.length ?? 0) > 0 || expansionPotential || scenarios.length > 0 || scenarioLoading) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">캠페인 최적화 가이드</h2>
          <p className="text-xs text-gray-400 mb-5">예측 데이터 기반 캠페인 최적화 인사이트</p>
          <div className="space-y-4">

            {/* 0. AI 인사이트 3줄 */}
            {result.insights && result.insights.length > 0 && (
              <div className="space-y-2.5">
                {result.insights.map((insight, i) => {
                  const icons = ['📌', '📅', '🎯'];
                  const borders = ['border-indigo-200 bg-indigo-50', 'border-amber-200 bg-amber-50', 'border-purple-200 bg-purple-50'];
                  return (
                    <div key={i} className={`flex items-start gap-2.5 p-3.5 rounded-xl border ${borders[i] ?? 'border-gray-100 bg-gray-50'}`}>
                      <span className="text-base leading-none mt-0.5">{icons[i]}</span>
                      <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* B. 성과 확장 잠재력 */}
            {expansionPotential && (
              expansionPotential.canExpand ? (
                <div className="rounded-xl p-4 border-l-4 border-emerald-400 bg-emerald-50">
                  <p className="text-sm font-semibold text-gray-800 mb-1">🚀 성과 확장 잠재력</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    현재 빈도({expansionPotential.frequency.toFixed(1)}회)와 모수 도달률({Math.round(expansionPotential.reachRate * 100)}%)이 낮아
                    {' '}<strong className="text-emerald-700">효율 저하 없이 확장이 가능합니다.</strong>{' '}
                    예산을 20% 증액(+₩{(expansionPotential.additionalBudget ?? 0).toLocaleString()})하면
                    약 <strong className="text-emerald-700">{(expansionPotential.additionalReach ?? 0).toLocaleString()}명</strong>을 추가로 도달할 수 있습니다.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl p-4 border-l-4 border-blue-400 bg-blue-50">
                  <p className="text-sm font-semibold text-gray-800 mb-1">✅ 성과 확장 잠재력</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    현재 예산이 타겟 모수에 최적화되어 있습니다.
                    {' '}(빈도 {expansionPotential.frequency.toFixed(1)}회 · 모수 도달률 {Math.round(expansionPotential.reachRate * 100)}%)
                  </p>
                </div>
              )
            )}

            {/* C. 타겟 확장 시나리오 */}
            {(scenarioLoading || scenarios.length > 0) && (
              <div className="rounded-xl p-4 border border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800 mb-3">🎯 타겟 확장 시나리오 비교</p>
                {scenarioLoading ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                    시나리오 계산 중...
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-3 text-gray-500 font-medium">시나리오</th>
                          <th className="text-right py-2 pr-3 text-gray-500 font-medium">CPM</th>
                          <th className="text-right py-2 pr-3 text-gray-500 font-medium">예상 도달</th>
                          <th className="text-right py-2 pr-3 text-gray-500 font-medium">VTR</th>
                          <th className="text-right py-2 text-gray-500 font-medium">CPC</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 현재 타겟 row */}
                        <tr className="border-b border-gray-100 bg-indigo-50">
                          <td className="py-2 pr-3 font-semibold text-indigo-700">현재 타겟</td>
                          <td className="py-2 pr-3 text-right font-mono text-indigo-700">₩{result.cpm.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right font-mono text-indigo-700">{totalReach.toLocaleString()}명</td>
                          <td className="py-2 pr-3 text-right font-mono text-indigo-700">{result.vtr > 0 ? `${result.vtr.toFixed(2)}%` : '—'}</td>
                          <td className="py-2 text-right font-mono text-indigo-700">{result.cpc > 0 ? `₩${result.cpc.toLocaleString()}` : '—'}</td>
                        </tr>
                        {scenarios.map((s) => {
                          const cpmBetter = s.cpm > 0 && s.cpm < result.cpm;
                          const reachMore = s.reach * durationFactor > totalReach;
                          return (
                            <tr key={s.label} className="border-b border-gray-100 hover:bg-white transition-colors">
                              <td className="py-2 pr-3">
                                <p className="font-medium text-gray-700">{s.label}</p>
                                <p className="text-gray-400 text-[11px]">{s.description}</p>
                              </td>
                              <td className="py-2 pr-3 text-right font-mono">
                                <span className={cpmBetter ? 'text-emerald-600 font-semibold' : 'text-red-500'}>
                                  ₩{s.cpm.toLocaleString()}
                                </span>
                                {result.cpm > 0 && (
                                  <span className="ml-1 text-[11px] text-gray-400">
                                    ({((s.cpm - result.cpm) / result.cpm * 100).toFixed(1)}%)
                                  </span>
                                )}
                              </td>
                              <td className="py-2 pr-3 text-right font-mono">
                                <span className={reachMore ? 'text-emerald-600 font-semibold' : 'text-red-500'}>
                                  {Math.round(s.reach * durationFactor).toLocaleString()}명
                                </span>
                              </td>
                              <td className="py-2 pr-3 text-right font-mono text-gray-600">
                                {s.vtr > 0 ? `${s.vtr.toFixed(2)}%` : '—'}
                              </td>
                              <td className="py-2 text-right font-mono text-gray-600">
                                {s.cpc > 0 ? `₩${s.cpc.toLocaleString()}` : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">예측 결과</h2>
          <div className="flex items-center gap-3">
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
        {/* 기간 요약 문구 */}
        {result && (
          <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-700">
            선택하신 기간은 총 <strong>{campaignDays}일</strong>이며,
            일 평균 <strong>₩{dailyBudget.toLocaleString()}</strong>의 예산이 투입될 예정입니다.
            {isPeakSeason && <span className="ml-1 text-amber-600">（11~12월 성수기 CPM +15% 반영）</span>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title={`예상 도달 (${campaignDays}일)`} value={result ? totalReach.toLocaleString() : '—'}
            change={null} icon="👥" loading={loading} />
          <KPICard
            title={`예상 CPM${isPeakSeason ? ' (성수기 +15%)' : ''}`}
            value={result ? `₩${(isPeakSeason ? Math.round(result.cpm * PEAK_CPM_MULTIPLIER) : result.cpm).toLocaleString()}` : '—'}
            change={null} icon="📊" loading={loading} />
          <KPICard title="CPC(전체)" value={result ? (result.cpc > 0 ? `₩${result.cpc.toLocaleString()}` : '—') : '—'}
            change={null} icon="🖱️" loading={loading} />
          <KPICard title="CPC(링크)" value={result ? (result.cpcLink > 0 ? `₩${result.cpcLink.toLocaleString()}` : '—') : '—'}
            change={null} icon="🔗" loading={loading} />
          <KPICard title="동영상 3초 조회당 비용" value={result ? (result.cpv > 0 ? `₩${result.cpv.toLocaleString()}` : '—') : '—'}
            change={null} icon="🎬" loading={loading} />
          <KPICard title="VTR(3s)" value={result ? (result.vtr > 0 ? `${result.vtr.toFixed(2)}%` : '—') : '—'}
            change={null} icon="▶️" loading={loading} />
        </div>
      </div>

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
