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

  useEffect(() => {
    fetch('/api/filters')
      .then((r) => r.json())
      .then((f) => {
        setAvailableIndustries(f.industries ?? []);
        setAvailableObjectives(f.objectives ?? []);
      });
  }, []);

  // 월별 추이 데이터
  useEffect(() => {
    setLoading(true);
    fetch(`/api/trends?${buildParams(objectives, trendIndustries)}`)
      .then((r) => r.json())
      .then(setTrendData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [objectives, trendIndustries]);

  // 효율 순위 (업종 필터 없음 — 전체 기준)
  useEffect(() => {
    const params = new URLSearchParams();
    if (objectives.length > 0) params.set('objectives', objectives.join(','));
    fetch(`/api/breakdown?${params}`)
      .then((r) => r.json())
      .then((d) => setEfficiencyRanks(d.efficiencyRanks ?? []))
      .catch(console.error);
  }, [objectives]);

  // 성별 분포
  useEffect(() => {
    fetch(`/api/breakdown?${buildParams(objectives, genderIndustries)}`)
      .then((r) => r.json())
      .then((d) => setGenderBreakdown(d.byGender ?? []))
      .catch(console.error);
  }, [objectives, genderIndustries]);

  // 연령대 분포
  useEffect(() => {
    fetch(`/api/breakdown?${buildParams(objectives, ageIndustries)}`)
      .then((r) => r.json())
      .then((d) => setAgeBreakdown(d.byAge ?? []))
      .catch(console.error);
  }, [objectives, ageIndustries]);

  function toggleObjective(value: string) {
    setObjectives((prev) => prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value]);
  }

  const metricConfig = METRIC_OPTIONS.find((m) => m.key === metric)!;
  const top3 = getTop3(efficiencyRanks, metric);

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">업종별 트렌드</h1>
        <p className="text-sm text-gray-500 mt-1">업종별 광고 성과 지표 추이를 확인합니다.</p>
      </div>

      {/* 전역 필터: 캠페인 목표 + 지표 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-wrap gap-8 items-start">

          {/* 캠페인 목표 */}
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

          {/* 지표 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">지표</label>
            <select value={metric} onChange={(e) => setMetric(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {METRIC_OPTIONS.map((m) => (
                <option key={m.key} value={m.key}>{m.label}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* ── 업종별 효율 순위 Top 3 ── */}
      {top3.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-1">업종별 효율 순위 Top 3</h2>
          <p className="text-xs text-gray-400 mb-5">
            {metricConfig.label} 기준 —{' '}
            {metric === 'avgCTR' || metric === 'totalReach' ? '높을수록 효율적' : '낮을수록 효율적'}
          </p>
          <div className="flex gap-4 flex-wrap">
            {top3.map((r, i) => (
              <div key={r.industry} className="flex-1 min-w-[140px] bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{RANK_BADGE[i]}</div>
                <div className="font-semibold text-gray-800 text-sm mb-2">{r.industry}</div>
                <div className="text-indigo-600 font-bold text-lg">
                  {metricConfig.format((r as unknown as Record<string, number>)[metric])}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 월별 지표 추이 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h2 className="text-base font-semibold text-gray-800">월별 {metricConfig.label} 추이</h2>
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={trendIndustries}
            onChange={setTrendIndustries}
          />
        </div>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : trendChartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">데이터가 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
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
        )}
      </div>

      {/* ── 업종별 최신 비교 (월별 추이와 동일 업종 필터 공유) ── */}
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

      {/* ── 성별 분포 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">성별 {metricConfig.label} 분포</h2>
            <p className="text-xs text-gray-400 mt-0.5">업종별 남성/여성 {metricConfig.label} 비교</p>
          </div>
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={genderIndustries}
            onChange={setGenderIndustries}
          />
        </div>
        {genderChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm mt-4">데이터가 없습니다.</div>
        ) : (
          <div className="mt-6">
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
      </div>

      {/* ── 연령대 분포 ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">연령대별 {metricConfig.label} 분포</h2>
            <p className="text-xs text-gray-400 mt-0.5">업종별 연령대 {metricConfig.label} 비교</p>
          </div>
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={ageIndustries}
            onChange={setAgeIndustries}
          />
        </div>
        {ageChartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm mt-4">데이터가 없습니다.</div>
        ) : (
          <div className="mt-6">
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
      </div>

      {/* 상세 데이터 테이블 */}
      {trendData.length > 0 && (
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
              {trendData.flatMap((d) =>
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
