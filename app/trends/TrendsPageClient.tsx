'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import StatePanel from '@/components/StatePanel';

interface TrendPoint {
  month: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  count: number;
}

interface IndustryTrend {
  industry: string;
  trends: TrendPoint[];
}

interface BreakdownRow {
  group: string;
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
}

interface EfficiencyRank {
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  cpmRank: number;
  cpcRank: number;
  ctrRank: number;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: '인지도',
  OUTCOME_ENGAGEMENT: '참여',
  LINK_CLICKS: '트래픽',
  OUTCOME_SALES: '전환/판매',
};

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
const GENDER_COLORS: Record<string, string> = { male: '#6366f1', female: '#f59e0b', unknown: '#10b981' };
const GENDER_LABELS: Record<string, string> = { male: '남성', female: '여성', unknown: '전체' };
const AGE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
const RANK_BADGE = ['🥇', '🥈', '🥉'];

const METRIC_OPTIONS = [
  { key: 'avgCPM',     label: 'CPM (원)',  format: (v: number) => `₩${v.toLocaleString()}` },
  { key: 'avgCPC',     label: 'CPC (원)',  format: (v: number) => `₩${v.toLocaleString()}` },
  { key: 'avgCTR',     label: 'CTR (%)',   format: (v: number) => `${v.toFixed(3)}%` },
  { key: 'totalReach', label: '총 도달',   format: (v: number) => v.toLocaleString() },
];

// 지표별 상위 3개 추출 (CPM/CPC는 낮을수록, CTR/도달은 높을수록 좋음)
function getTop3(ranks: EfficiencyRank[], metric: string) {
  const higherBetter = metric === 'avgCTR' || metric === 'totalReach';
  return [...ranks]
    .filter((r) => (r as unknown as Record<string, number>)[metric] > 0)
    .sort((a, b) => {
      const av = (a as unknown as Record<string, number>)[metric];
      const bv = (b as unknown as Record<string, number>)[metric];
      return higherBetter ? bv - av : av - bv;
    })
    .slice(0, 3);
}

function mergeByMonth(trends: IndustryTrend[], metric: string) {
  const monthMap = new Map<string, Record<string, number>>();
  for (const { industry, trends: pts } of trends) {
    for (const pt of pts) {
      if (!monthMap.has(pt.month)) monthMap.set(pt.month, { month: pt.month as unknown as number });
      monthMap.get(pt.month)![industry] = (pt as unknown as Record<string, number>)[metric];
    }
  }
  return [...monthMap.values()].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}

function buildParams(objectives: string[], industries: string[]) {
  const params = new URLSearchParams();
  if (objectives.length > 0) params.set('objectives', objectives.join(','));
  if (industries.length > 0) params.set('industries', industries.join(','));
  return params.toString();
}

function toJsonOrThrow(response: Response) {
  if (!response.ok) throw new Error('request_failed');
  return response.json();
}

function labelObjectives(objectives: string[]) {
  if (objectives.length === 0) return '목표 전체';
  return objectives.map((obj) => OBJECTIVE_LABELS[obj] ?? obj).join(', ');
}

function labelIndustries(industries: string[]) {
  if (industries.length === 0) return '업종 전체';
  if (industries.length <= 2) return industries.join(', ');
  return `${industries.slice(0, 2).join(', ')} 외 ${industries.length - 2}`;
}

function chartEmptyDescription(scope: string, selectedIndustries: string[]) {
  const industryHint = selectedIndustries.length > 0
    ? '업종 선택을 줄이거나 전체 업종으로 되돌려 보세요.'
    : '목표 필터를 해제하거나 벤치마크 적재 상태를 확인해 주세요.';
  return `${scope} 기준 데이터가 없습니다. ${industryHint}`;
}

// 차트 내 업종 필터 컴포넌트
function ChartIndustryFilter({
  availableIndustries,
  selected,
  onChange,
}: {
  availableIndustries: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="w-56">
      <MultiSelectDropdown
        label=""
        options={availableIndustries}
        selected={selected}
        onChange={onChange}
        placeholder="업종 전체"
      />
    </div>
  );
}

export default function TrendsPage() {
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availableObjectives, setAvailableObjectives] = useState<string[]>([]);

  // 전역 필터
  const [objectives, setObjectives] = useState<string[]>([]);
  const [metric, setMetric] = useState('avgCPM');

  // 차트별 개별 업종 필터
  const [trendIndustries, setTrendIndustries] = useState<string[]>([]);
  const [genderIndustries, setGenderIndustries] = useState<string[]>([]);
  const [ageIndustries, setAgeIndustries] = useState<string[]>([]);

  // 데이터 상태
  const [trendData, setTrendData] = useState<IndustryTrend[]>([]);
  const [efficiencyRanks, setEfficiencyRanks] = useState<EfficiencyRank[]>([]);
  const [genderBreakdown, setGenderBreakdown] = useState<BreakdownRow[]>([]);
  const [ageBreakdown, setAgeBreakdown] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersError, setFiltersError] = useState(false);
  const [trendError, setTrendError] = useState(false);
  const [efficiencyError, setEfficiencyError] = useState(false);
  const [genderError, setGenderError] = useState(false);
  const [ageError, setAgeError] = useState(false);

  useEffect(() => {
    fetch('/api/filters')
      .then(toJsonOrThrow)
      .then((f) => {
        setFiltersError(false);
        setAvailableIndustries(f.industries ?? []);
        setAvailableObjectives(f.objectives ?? []);
      })
      .catch(() => setFiltersError(true));
  }, []);

  // 월별 추이 데이터
  useEffect(() => {
    // Loading state intentionally resets whenever the filter-driven fetch starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetch(`/api/trends?${buildParams(objectives, trendIndustries)}`)
      .then(toJsonOrThrow)
      .then((data) => {
        setTrendError(false);
        setTrendData(data);
      })
      .catch(() => {
        setTrendData([]);
        setTrendError(true);
      })
      .finally(() => setLoading(false));
  }, [objectives, trendIndustries]);

  // 효율 순위 (업종 필터 없음 — 전체 기준)
  useEffect(() => {
    const params = new URLSearchParams();
    if (objectives.length > 0) params.set('objectives', objectives.join(','));
    fetch(`/api/breakdown?${params}`)
      .then(toJsonOrThrow)
      .then((d) => {
        setEfficiencyError(false);
        setEfficiencyRanks(d.efficiencyRanks ?? []);
      })
      .catch(() => {
        setEfficiencyRanks([]);
        setEfficiencyError(true);
      });
  }, [objectives]);

  // 성별 분포
  useEffect(() => {
    fetch(`/api/breakdown?${buildParams(objectives, genderIndustries)}`)
      .then(toJsonOrThrow)
      .then((d) => {
        setGenderError(false);
        setGenderBreakdown(d.byGender ?? []);
      })
      .catch(() => {
        setGenderBreakdown([]);
        setGenderError(true);
      });
  }, [objectives, genderIndustries]);

  // 연령대 분포
  useEffect(() => {
    fetch(`/api/breakdown?${buildParams(objectives, ageIndustries)}`)
      .then(toJsonOrThrow)
      .then((d) => {
        setAgeError(false);
        setAgeBreakdown(d.byAge ?? []);
      })
      .catch(() => {
        setAgeBreakdown([]);
        setAgeError(true);
      });
  }, [objectives, ageIndustries]);

  function selectObjective(value: string) {
    setObjectives((prev) => prev.includes(value) ? [] : [value]);
  }

  const metricConfig = METRIC_OPTIONS.find((m) => m.key === metric)!;
  const top3 = getTop3(efficiencyRanks, metric);
  const objectiveContext = labelObjectives(objectives);
  const trendIndustryContext = labelIndustries(trendIndustries);
  const genderIndustryContext = labelIndustries(genderIndustries);
  const ageIndustryContext = labelIndustries(ageIndustries);
  const activeFilterCount = objectives.length + trendIndustries.length + genderIndustries.length + ageIndustries.length;

  const trendChartData = mergeByMonth(trendData, metric);
  const trendIndustryKeys = trendData.map((d) => d.industry);
  const summaryRows = trendData.map((d) => ({ industry: d.industry, ...(d.trends[d.trends.length - 1] ?? {}) }));

  const genderGroups = [...new Set(genderBreakdown.map((r) => r.group))];
  const genderIndustryKeys = [...new Set(genderBreakdown.map((r) => r.industry))];
  const genderChartData = genderIndustryKeys.map((ind) => {
    const row: Record<string, string | number> = { industry: ind };
    for (const g of genderGroups) {
      const found = genderBreakdown.find((r) => r.industry === ind && r.group === g);
      row[g] = (found as unknown as Record<string, number>)?.[metric] ?? 0;
    }
    return row;
  });

  const ageGroups = [...new Set(ageBreakdown.map((r) => r.group))];
  const ageIndustryKeys = [...new Set(ageBreakdown.map((r) => r.industry))];
  const ageChartData = ageIndustryKeys.map((ind) => {
    const row: Record<string, string | number> = { industry: ind };
    for (const a of ageGroups) {
      const found = ageBreakdown.find((r) => r.industry === ind && r.group === a);
      row[a] = (found as unknown as Record<string, number>)?.[metric] ?? 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Benchmark Signal</p>
            <h1 className="mt-2 text-2xl font-bold text-gray-950">업종별 트렌드</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Meta 벤치마크를 목표, 업종, 지표별로 비교해 플래닝 기준선을 점검합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[11px] font-medium text-gray-500">목표</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">{objectiveContext}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[11px] font-medium text-gray-500">지표</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">{metricConfig.label}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[11px] font-medium text-gray-500">추이</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">{trendIndustryContext}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="text-[11px] font-medium text-gray-500">상태</p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                {activeFilterCount > 0 ? `${activeFilterCount}개 필터` : '전체 기준'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 전역 필터: 캠페인 목표 + 지표 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {filtersError && (
          <StatePanel
            variant="error"
            title="필터 정보를 불러오지 못했습니다"
            description="기본 범위로 화면을 표시합니다. 잠시 후 새로고침하거나 운영 담당자에게 문의해 주세요."
            className="mb-5 min-h-32"
          />
        )}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

          {/* 캠페인 목표 */}
          <div className="min-w-0 flex-1 space-y-1">
            <label className="text-sm font-semibold text-gray-800">캠페인 목표</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableObjectives.map((obj) => {
                const active = objectives.includes(obj);
                return (
                  <button key={obj} type="button" onClick={() => selectObjective(obj)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active ? 'bg-indigo-600 text-white border-indigo-600'
                             : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                    {OBJECTIVE_LABELS[obj] ?? obj}
                  </button>
                );
              })}
              {availableObjectives.length === 0 && (
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
                  목표 목록 대기
                </span>
              )}
              {objectives.length > 0 && (
                <button type="button" onClick={() => setObjectives([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                  초기화
                </button>
              )}
            </div>
            {objectives.length === 0 && <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>}
          </div>

          {/* 지표 */}
          <div className="min-w-0 space-y-1 lg:max-w-[420px]">
            <label className="text-sm font-semibold text-gray-800">지표</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {METRIC_OPTIONS.map((m) => (
                <button key={m.key} type="button" onClick={() => setMetric(m.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    metric === m.key
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── 업종별 효율 순위 Top 3 ── */}
      {efficiencyError && (
        <StatePanel
          variant="error"
          title="효율 순위를 불러오지 못했습니다"
          description="업종별 순위 영역만 일시적으로 표시할 수 없습니다. 다른 차트는 가능한 범위에서 계속 표시됩니다."
        />
      )}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">업종별 효율 순위 Top 3</h2>
            <p className="text-xs text-gray-500">
              {objectiveContext} · {metricConfig.label} ·{' '}
              {metric === 'avgCTR' || metric === 'totalReach' ? '높을수록 효율적' : '낮을수록 효율적'}
            </p>
          </div>
        </div>
        {top3.length > 0 ? (
          <div className="flex gap-4 flex-wrap">
            {top3.map((r, i) => (
              <div key={r.industry} className="min-w-[160px] flex-1 rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                <div className="text-2xl mb-1">{RANK_BADGE[i]}</div>
                <div className="mb-2 truncate text-sm font-semibold text-gray-800">{r.industry}</div>
                <div className="text-lg font-bold text-blue-700">
                  {metricConfig.format((r as unknown as Record<string, number>)[metric])}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <StatePanel
            variant="empty"
            title="순위 산정 가능한 업종이 없습니다"
            description="목표 필터를 해제하거나 벤치마크 적재 후 다시 확인해 주세요. CPM/CPC는 낮은 값, CTR/도달은 높은 값을 기준으로 정렬합니다."
            className="min-h-40"
          />
        )}
      </div>

      {/* ── 월별 지표 추이 ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">월별 {metricConfig.label} 추이</h2>
            <p className="mt-1 text-xs text-gray-500">{objectiveContext} · {trendIndustryContext}</p>
          </div>
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={trendIndustries}
            onChange={setTrendIndustries}
          />
        </div>
        {loading ? (
          <StatePanel
            variant="loading"
            title="월별 추이 데이터를 불러오고 있습니다"
            description="선택한 목표와 업종 필터를 기준으로 지표를 집계 중입니다."
            className="h-64"
          />
        ) : trendError ? (
          <StatePanel
            variant="error"
            title="월별 추이 데이터를 불러오지 못했습니다"
            description="일시적으로 지표 연결을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."
            className="h-64"
          />
        ) : trendChartData.length === 0 ? (
          <StatePanel
            variant="empty"
            title="월별 추이를 표시할 데이터가 아직 없습니다"
            description={chartEmptyDescription('월별 추이', trendIndustries)}
            className="h-64"
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="h-[280px] min-w-[640px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(v)} width={80} />
                  <Tooltip formatter={(v) => metricConfig.format(Number(v))} />
                  <Legend />
                  {trendIndustryKeys.map((ind, i) => (
                    <Line key={ind} type="monotone" dataKey={ind} stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── 업종별 최신 비교 (월별 추이와 동일 업종 필터 공유) ── */}
      {summaryRows.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-900">업종별 최신 {metricConfig.label} 비교</h2>
            <p className="mt-1 text-xs text-gray-500">{trendIndustryContext} · 월별 추이와 동일한 업종 기준</p>
          </div>
          <div className="overflow-x-auto">
            <div className="h-[220px] min-w-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryRows} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="industry" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(v)} width={80} />
                  <Tooltip formatter={(v) => metricConfig.format(Number(v))} />
                  <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
                    {summaryRows.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── 성별 분포 ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">성별 {metricConfig.label} 분포</h2>
            <p className="mt-1 text-xs text-gray-500">{objectiveContext} · {genderIndustryContext}</p>
          </div>
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={genderIndustries}
            onChange={setGenderIndustries}
          />
        </div>
        {genderChartData.length === 0 ? (
          <StatePanel
            variant={genderError ? 'error' : 'empty'}
            title={genderError ? '성별 분포를 불러오지 못했습니다' : '성별 분포를 표시할 데이터가 아직 없습니다'}
            description={genderError
              ? '일시적으로 성별 비교 데이터를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'
              : chartEmptyDescription('성별 분포', genderIndustries)}
            className="h-48 mt-4"
          />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="h-[240px] min-w-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderChartData} barGap={6} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="industry" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(Number(v))} width={80} />
                  <Tooltip formatter={(v) => [metricConfig.format(Number(v)), '']} />
                  <Legend formatter={(v) => GENDER_LABELS[v] ?? v} />
                  {genderGroups.map((g) => (
                    <Bar key={g} dataKey={g} name={GENDER_LABELS[g] ?? g} fill={GENDER_COLORS[g] ?? '#6366f1'} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── 연령대 분포 ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">연령대별 {metricConfig.label} 분포</h2>
            <p className="mt-1 text-xs text-gray-500">{objectiveContext} · {ageIndustryContext}</p>
          </div>
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={ageIndustries}
            onChange={setAgeIndustries}
          />
        </div>
        {ageChartData.length === 0 ? (
          <StatePanel
            variant={ageError ? 'error' : 'empty'}
            title={ageError ? '연령대별 분포를 불러오지 못했습니다' : '연령대별 분포를 표시할 데이터가 아직 없습니다'}
            description={ageError
              ? '일시적으로 연령대 비교 데이터를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.'
              : chartEmptyDescription('연령대 분포', ageIndustries)}
            className="h-48 mt-4"
          />
        ) : (
          <div className="mt-6 overflow-x-auto">
            <div className="h-[260px] min-w-[640px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageChartData} barGap={4} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="industry" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(Number(v))} width={80} />
                  <Tooltip formatter={(v) => [metricConfig.format(Number(v)), '']} />
                  <Legend />
                  {ageGroups.map((a, i) => (
                    <Bar key={a} dataKey={a} fill={AGE_COLORS[i % AGE_COLORS.length]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* ── 경쟁사 모니터링 바로가기 ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">소재 맥락이 필요하다면</p>
          <p className="text-xs text-gray-500 mt-0.5">벤치마크 해석 전 Meta 광고 라이브러리 소재 흐름을 함께 확인하세요.</p>
        </div>
        <a
          href="/competitor"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 sm:w-auto sm:shrink-0"
        >
          경쟁사 모니터링 →
        </a>
      </div>
    </div>
  );
}
