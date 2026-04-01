'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import KPICard from '@/components/KPICard';
import BudgetSlider from '@/components/BudgetSlider';
import ConditionTags from '@/components/ConditionTags';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';

const ALL_GENDERS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];

const OBJECTIVE_LABELS: Record<string, string> = {
  'OUTCOME_AWARENESS': '인지도',
  'OUTCOME_ENGAGEMENT': '참여',
  'LINK_CLICKS': '트래픽',
  'OUTCOME_SALES': '전환/판매',
};

const ALL_AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

interface PredictResult {
  reach: number;
  cpm: number;
  cpc: number;
  cpcLink: number;
  cpv: number;
  vtr: number;
  frequency: number;
  reachChange: number | null;
  cpmChange: number | null;
  cpcChange: number | null;
  matchedCount: number;
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

export default function SimulatorPage() {
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availableObjectives, setAvailableObjectives] = useState<string[]>([]);

  // Multi-select state (empty = 전체)
  const [industries, setIndustries] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [ageRanges, setAgeRanges] = useState<string[]>([]);
  const [budget, setBudget] = useState(10_000_000);

  const [result, setResult] = useState<PredictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [rangeData, setRangeData] = useState<RangePoint[]>([]);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rangeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[]; budget: number;
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
    industries: string[]; genders: string[]; ageRanges: string[]; objectives: string[];
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchPrediction({ industries, genders, ageRanges, objectives, budget });
    }, 300);
  }, [industries, genders, ageRanges, objectives, budget, fetchPrediction]);

  useEffect(() => {
    if (rangeDebounceRef.current) clearTimeout(rangeDebounceRef.current);
    rangeDebounceRef.current = setTimeout(() => {
      fetchRange({ industries, genders, ageRanges, objectives });
    }, 400);
  }, [industries, genders, ageRanges, objectives, fetchRange]);

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

  const tags = [
    { label: '업종', value: industryLabel },
    { label: 'Gender', value: genderLabel },
    { label: '캠페인 목표', value: objectiveLabel },
    { label: 'Age', value: ageLabel },
    { label: '예산', value: `₩${budget.toLocaleString()}` },
  ];

  // Chart data
  const chartData = rangeData.map((p) => ({
    ...p,
    label: formatBudget(p.budget),
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-5">캠페인 설정</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Industry - multi-select dropdown */}
          <MultiSelectDropdown
            label="타겟 업종"
            options={availableIndustries}
            selected={industries}
            onChange={setIndustries}
            placeholder="전체"
          />

          {/* Gender - pill checkboxes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">성별</label>
            <div className="flex gap-2 pt-1">
              {ALL_GENDERS.map(({ value, label }) => {
                const active = genders.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleGender(value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              {genders.length > 0 && (
                <button
                  type="button"
                  onClick={() => setGenders([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
            {genders.length === 0 && (
              <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>
            )}
          </div>

          {/* Campaign Objective */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">캠페인 목표</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableObjectives.map((obj) => {
                const active = objectives.includes(obj);
                return (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => toggleObjective(obj)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {OBJECTIVE_LABELS[obj] ?? obj}
                  </button>
                );
              })}
              {objectives.length > 0 && (
                <button
                  type="button"
                  onClick={() => setObjectives([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
            {objectives.length === 0 && (
              <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>
            )}
          </div>

          {/* Age range - multi-select pills */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">연령대</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_AGE_RANGES.map((age) => {
                const active = ageRanges.includes(age);
                return (
                  <button
                    key={age}
                    type="button"
                    onClick={() => toggleAgeRange(age)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {age}
                  </button>
                );
              })}
              {ageRanges.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAgeRanges([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors"
                >
                  초기화
                </button>
              )}
            </div>
            {ageRanges.length === 0 && (
              <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>
            )}
          </div>

          {/* Budget */}
          <div className="lg:col-span-3">
            <BudgetSlider value={budget} onChange={setBudget} />
          </div>
        </div>
      </div>

      {/* Condition Tags */}
      <div>
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">현재 적용 조건</p>
        <ConditionTags tags={tags} />
      </div>

      {/* KPI Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-800">예측 결과</h2>
          <div className="flex items-center gap-3">
            {result && !loading && (
              <span className="text-xs text-gray-400">
                매칭 데이터 {result.matchedCount}건 · 평균 빈도 {result.frequency?.toFixed(2)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KPICard title="예상 도달 (Reach)" value={result ? result.reach.toLocaleString() : '—'}
            change={result?.reachChange ?? null} icon="👥" loading={loading} />
          <KPICard title="예상 CPM" value={result ? `₩${result.cpm.toLocaleString()}` : '—'}
            change={result?.cpmChange ?? null} icon="📊" loading={loading} />
          <KPICard title="CPC(전체)" value={result ? (result.cpc > 0 ? `₩${result.cpc.toLocaleString()}` : '—') : '—'}
            change={result?.cpcChange ?? null} icon="🖱️" loading={loading} />
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
                <th className="text-right py-2.5 pr-4 text-gray-500 font-medium">CPM</th>
                <th className="text-right py-2.5 pr-4 text-gray-500 font-medium">CPC</th>
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
                    <td className="py-2.5 pr-4 text-right text-gray-700">₩{row.cpm.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">₩{row.cpc.toLocaleString()}</td>
                    <td className={`py-2.5 text-right font-mono ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {row.reachEfficiency.toLocaleString()}명
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">* 행을 클릭하면 해당 예산으로 슬라이더가 이동합니다.</p>
      </div>

      {/* Info Note */}
      <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-700">
        <strong>예측 방식:</strong> Meta 공식 기반 (예산÷CPM×1000÷빈도) + Diminishing Returns 보정 (β=0.82).
        캠페인 목표별 CPM·빈도를 실제 데이터에서 적용하며, 예산이 클수록 단위당 도달 효율이 감소합니다.
      </div>
    </div>
  );
}
