'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';

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

const ALL_AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

const ALL_GENDERS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
];

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_AWARENESS: '인지도',
  OUTCOME_ENGAGEMENT: '참여',
  LINK_CLICKS: '트래픽',
  OUTCOME_SALES: '전환/판매',
};

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
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

export default function TrendsPage() {
  const [data, setData] = useState<IndustryTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [industries, setIndustries] = useState<string[]>([]);
  const [genders, setGenders] = useState<string[]>([]);
  const [ageRanges, setAgeRanges] = useState<string[]>([]);
  const [objectives, setObjectives] = useState<string[]>([]);
  const [metric, setMetric] = useState('avgCPM');
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);
  const [availableObjectives, setAvailableObjectives] = useState<string[]>([]);

  const [breakdown, setBreakdown] = useState<{
    byGender: BreakdownRow[];
    byAge: BreakdownRow[];
    efficiencyRanks: EfficiencyRank[];
  } | null>(null);

  useEffect(() => {
    fetch('/api/filters')
      .then((r) => r.json())
      .then((f) => {
        setAvailableIndustries(f.industries ?? []);
        setAvailableObjectives(f.objectives ?? []);
      });
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (industries.length > 0) params.set('industries', industries.join(','));
    if (genders.length > 0) params.set('genders', genders.join(','));
    if (ageRanges.length > 0) params.set('ageRanges', ageRanges.join(','));
    if (objectives.length > 0) params.set('objectives', objectives.join(','));
    fetch(`/api/trends?${params}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [industries, genders, ageRanges, objectives]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (industries.length > 0) params.set('industries', industries.join(','));
    if (genders.length > 0) params.set('genders', genders.join(','));
    if (ageRanges.length > 0) params.set('ageRanges', ageRanges.join(','));
    if (objectives.length > 0) params.set('objectives', objectives.join(','));
    fetch(`/api/breakdown?${params}`)
      .then((r) => r.json())
      .then(setBreakdown)
      .catch(console.error);
  }, [industries, genders, ageRanges, objectives]);

  function toggleGender(value: string) {
    setGenders((prev) => prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]);
  }
  function toggleAgeRange(value: string) {
    setAgeRanges((prev) => prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]);
  }
  function toggleObjective(value: string) {
    setObjectives((prev) => prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value]);
  }

  const metricConfig = METRIC_OPTIONS.find((m) => m.key === metric)!;
  const chartData = mergeByMonth(data, metric);
  const displayedIndustries = data.map((d) => d.industry);

  const summaryRows = data.map((d) => {
    const latest = d.trends[d.trends.length - 1];
    return { industry: d.industry, ...latest };
  });

  const genderGroups = breakdown ? [...new Set(breakdown.byGender.map((r) => r.group))] : [];
  const genderChartData = breakdown
    ? displayedIndustries.map((ind) => {
        const row: Record<string, string | number> = { industry: ind };
        for (const g of genderGroups) {
          const found = breakdown.byGender.find((r) => r.industry === ind && r.group === g);
          row[g] = (found as unknown as Record<string, number>)?.[metric] ?? 0;
        }
        return row;
      })
    : [];

  const ageGroups = breakdown ? [...new Set(breakdown.byAge.map((r) => r.group))] : [];
  const ageChartData = breakdown
    ? displayedIndustries.map((ind) => {
        const row: Record<string, string | number> = { industry: ind };
        for (const a of ageGroups) {
          const found = breakdown.byAge.find((r) => r.industry === ind && r.group === a);
          row[a] = (found as unknown as Record<string, number>)?.[metric] ?? 0;
        }
        return row;
      })
    : [];

  const effRanks = breakdown?.efficiencyRanks ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">업종별 트렌드</h1>
        <p className="text-sm text-gray-500 mt-1">업종별 광고 성과 지표 추이를 확인합니다.</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* 업종 - multi-select dropdown */}
          <MultiSelectDropdown
            label="업종"
            options={availableIndustries}
            selected={industries}
            onChange={setIndustries}
            placeholder="전체"
          />

          {/* 성별 - pill buttons */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">성별</label>
            <div className="flex gap-2 pt-1 flex-wrap">
              {ALL_GENDERS.map(({ value, label }) => {
                const active = genders.includes(value);
                return (
                  <button key={value} type="button" onClick={() => toggleGender(value)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active ? 'bg-indigo-600 text-white border-indigo-600'
                             : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                    {label}
                  </button>
                );
              })}
              {genders.length > 0 && (
                <button type="button" onClick={() => setGenders([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                  초기화
                </button>
              )}
            </div>
            {genders.length === 0 && <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>}
          </div>

          {/* 지표 - single select */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">지표</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {METRIC_OPTIONS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* 캠페인 목표 - pill buttons */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">캠페인 목표</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {availableObjectives.map((obj) => {
                const active = objectives.includes(obj);
                return (
                  <button key={obj} type="button" onClick={() => toggleObjective(obj)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active ? 'bg-indigo-600 text-white border-indigo-600'
                             : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                    {OBJECTIVE_LABELS[obj] ?? obj}
                  </button>
                );
              })}
              {objectives.length > 0 && (
                <button type="button" onClick={() => setObjectives([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                  초기화
                </button>
              )}
            </div>
            {objectives.length === 0 && <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>}
          </div>

          {/* 연령대 - pill buttons */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">연령대</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {ALL_AGE_RANGES.map((age) => {
                const active = ageRanges.includes(age);
                return (
                  <button key={age} type="button" onClick={() => toggleAgeRange(age)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      active ? 'bg-indigo-600 text-white border-indigo-600'
                             : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    }`}>
                    {age}
                  </button>
                );
              })}
              {ageRanges.length > 0 && (
                <button type="button" onClick={() => setAgeRanges([])}
                  className="px-3 py-1.5 rounded-full text-xs text-gray-400 border border-gray-200 hover:text-gray-600 transition-colors">
                  초기화
                </button>
              )}
            </div>
            {ageRanges.length === 0 && <p className="text-xs text-gray-400 pt-0.5">선택 없음 = 전체</p>}
          </div>

        </div>
      </div>

      {/* ── 업종별 효율 순위 ── */}
      {effRanks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">업종별 효율 순위</h2>
          <p className="text-xs text-gray-400 mb-5">CPM·CPC 낮을수록, CTR 높을수록 효율적</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">업종</th>
                  <th className="text-center py-2 pr-4 text-gray-500 font-medium">CPM 순위</th>
                  <th className="text-right py-2 pr-4 text-gray-500 font-medium">CPM</th>
                  <th className="text-center py-2 pr-4 text-gray-500 font-medium">CPC 순위</th>
                  <th className="text-right py-2 pr-4 text-gray-500 font-medium">CPC</th>
                  <th className="text-center py-2 pr-4 text-gray-500 font-medium">CTR 순위</th>
                  <th className="text-right py-2 text-gray-500 font-medium">CTR</th>
                </tr>
              </thead>
              <tbody>
                {effRanks.map((r) => (
                  <tr key={r.industry} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-semibold text-gray-800">{r.industry}</td>
                    <td className="py-2.5 pr-4 text-center text-lg">
                      {RANK_BADGE[r.cpmRank - 1] ?? `${r.cpmRank}위`}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">₩{r.avgCPM.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-center text-lg">
                      {RANK_BADGE[r.cpcRank - 1] ?? `${r.cpcRank}위`}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">₩{r.avgCPC.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-center text-lg">
                      {RANK_BADGE[r.ctrRank - 1] ?? `${r.ctrRank}위`}
                    </td>
                    <td className="py-2.5 text-right text-gray-700">{r.avgCTR.toFixed(3)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 월별 지표 추이 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-6">월별 {metricConfig.label} 추이</h2>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">데이터가 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(v)} width={80} />
              <Tooltip formatter={(v) => metricConfig.format(Number(v))} />
              <Legend />
              {displayedIndustries.map((ind, i) => (
                <Line key={ind} type="monotone" dataKey={ind} stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 업종별 최신 성과 비교 */}
      {summaryRows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-6">업종별 최신 {metricConfig.label} 비교</h2>
          <ResponsiveContainer width="100%" height={220}>
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
      )}

      {/* 성별 분포 */}
      {genderChartData.length > 0 && genderGroups.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">성별 {metricConfig.label} 분포</h2>
          <p className="text-xs text-gray-400 mb-6">업종별 남성/여성 {metricConfig.label} 비교</p>
          <ResponsiveContainer width="100%" height={240}>
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
      )}

      {/* 연령대 분포 */}
      {ageChartData.length > 0 && ageGroups.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">연령대별 {metricConfig.label} 분포</h2>
          <p className="text-xs text-gray-400 mb-6">업종별 연령대 {metricConfig.label} 비교</p>
          <ResponsiveContainer width="100%" height={260}>
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
      )}

      {/* 상세 데이터 테이블 */}
      {data.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
          <h2 className="text-base font-semibold text-gray-800 mb-4">상세 데이터</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">업종</th>
                <th className="text-left py-2 pr-4 text-gray-500 font-medium">월</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">CPM</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">CPC</th>
                <th className="text-right py-2 pr-4 text-gray-500 font-medium">CTR</th>
                <th className="text-right py-2 text-gray-500 font-medium">도달</th>
              </tr>
            </thead>
            <tbody>
              {data.flatMap((d) =>
                d.trends.map((pt) => (
                  <tr key={`${d.industry}-${pt.month}`} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{d.industry}</td>
                    <td className="py-2 pr-4 text-gray-600">{pt.month}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">₩{pt.avgCPM.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">₩{pt.avgCPC.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right text-gray-700">{pt.avgCTR.toFixed(3)}%</td>
                    <td className="py-2 text-right text-gray-700">{pt.totalReach.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
