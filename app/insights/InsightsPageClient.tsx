'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

interface SeasonInsight {
  month: string;
  industry: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  totalReach: number;
  totalSpend: number;
  count: number;
}

interface SeasonalityWindow {
  dateRange: string;
  avgCPM: number;
  avgCPC: number;
  avgCTR: number;
  avgVTR: number;
  totalSpend: number;
  totalReach: number;
  count: number;
}

interface SeasonalityEvent {
  id: string;
  name: string;
  emoji: string;
  description: string;
  eventStart: string;
  eventEnd: string;
  before: SeasonalityWindow;
  during: SeasonalityWindow;
  after: SeasonalityWindow;
  cpmChange: number | null;
  cpcChange: number | null;
  ctrChange: number | null;
  vtrChange: number | null;
}

/* ── 변화율 뱃지 ── */
function ChangeBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-xs text-gray-300">-</span>;
  const color = value > 0
    ? (inverse ? 'text-red-500 bg-red-50' : 'text-emerald-600 bg-emerald-50')
    : (inverse ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50');
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-semibold ${color}`}>
      {value > 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ── 시즈널리티 카드 ── */
function SeasonalityCard({ event }: { event: SeasonalityEvent }) {
  const periods = [
    { key: 'before', label: '2주 전', data: event.before, bg: 'bg-gray-50', border: 'border-gray-200' },
    { key: 'during', label: '시즌 중', data: event.during, bg: 'bg-orange-50', border: 'border-orange-300' },
    { key: 'after',  label: '2주 후',  data: event.after,  bg: 'bg-blue-50',  border: 'border-blue-200' },
  ];

  const metrics = [
    { label: 'CPM',  beforeVal: event.before.avgCPM, duringVal: event.during.avgCPM,
      fmt: (v: number) => `₩${v.toLocaleString()}`, change: event.cpmChange, inverse: true },
    { label: 'CPC',  beforeVal: event.before.avgCPC, duringVal: event.during.avgCPC,
      fmt: (v: number) => v > 0 ? `₩${v.toLocaleString()}` : '-', change: event.cpcChange, inverse: true },
    { label: 'CTR',  beforeVal: event.before.avgCTR, duringVal: event.during.avgCTR,
      fmt: (v: number) => v > 0 ? `${v.toFixed(3)}%` : '-', change: event.ctrChange, inverse: false },
    { label: 'VTR',  beforeVal: event.before.avgVTR, duringVal: event.during.avgVTR,
      fmt: (v: number) => v > 0 ? `${v.toFixed(3)}%` : '-', change: event.vtrChange, inverse: false },
  ];

  // 차트 데이터
  const chartData = [
    { period: '2주 전', CPM: event.before.avgCPM, CPC: event.before.avgCPC },
    { period: '시즌 중', CPM: event.during.avgCPM, CPC: event.during.avgCPC },
    { period: '2주 후', CPM: event.after.avgCPM, CPC: event.after.avgCPC },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{event.emoji}</span>
          <div>
            <h3 className="text-base font-semibold text-gray-900">{event.name}</h3>
            <p className="text-xs text-gray-400">{event.description} · {event.eventStart}{event.eventStart !== event.eventEnd ? ` ~ ${event.eventEnd}` : ''}</p>
          </div>
        </div>
        {event.during.count === 0 && (
          <span className="text-xs text-orange-400 bg-orange-50 px-2 py-1 rounded-lg">시즌 중 데이터 없음</span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* 3구간 비교 카드 */}
        <div className="grid grid-cols-3 gap-3">
          {periods.map(({ key, label, data, bg, border }) => (
            <div key={key} className={`rounded-xl border ${border} ${bg} p-4`}>
              <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
              <p className="text-xs text-gray-400 mb-3">{data.dateRange}</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400">CPM</p>
                  <p className="text-sm font-bold text-gray-800">
                    {data.avgCPM > 0 ? `₩${data.avgCPM.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">CPC</p>
                  <p className="text-sm font-bold text-gray-800">
                    {data.avgCPC > 0 ? `₩${data.avgCPC.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">CTR</p>
                  <p className="text-sm font-bold text-gray-800">
                    {data.avgCTR > 0 ? `${data.avgCTR.toFixed(3)}%` : '-'}
                  </p>
                </div>
                {data.avgVTR > 0 && (
                  <div>
                    <p className="text-xs text-gray-400">VTR</p>
                    <p className="text-sm font-bold text-gray-800">{data.avgVTR.toFixed(3)}%</p>
                  </div>
                )}
                <div className="pt-1 border-t border-gray-200">
                  <p className="text-xs text-gray-400">데이터</p>
                  <p className="text-xs text-gray-600">{data.count.toLocaleString()}건</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 전 대비 변화율 요약 */}
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-2">2주 전 대비 시즌 중 변화</p>
          <div className="flex flex-wrap gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-3 py-1.5">
                <span className="text-xs text-gray-500">{m.label}</span>
                <ChangeBadge value={m.change} inverse={m.inverse} />
              </div>
            ))}
          </div>
          {event.cpmChange !== null && (
            <p className="text-xs text-gray-400 mt-2">
              {event.cpmChange > 0
                ? `⚠️ 시즌 중 CPM이 ${event.cpmChange}% 상승 → 동일 예산 대비 도달 감소 예상`
                : `✅ 시즌 중 CPM이 ${Math.abs(event.cpmChange ?? 0)}% 하락 → 효율 개선 가능성`}
            </p>
          )}
        </div>

        {/* CPM/CPC 막대 차트 */}
        {event.during.count > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">구간별 CPM / CPC 비교</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₩${(v/1000).toFixed(0)}K`} width={52} />
                <Tooltip formatter={(v) => [`₩${Number(v).toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="CPM" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="CPC" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [seasonality, setSeasonality] = useState<SeasonalityEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(true);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((d) => {
        const inds = [...new Set((d as SeasonInsight[]).map((x) => x.industry))].sort();
        setAvailableIndustries(inds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Loading state intentionally resets whenever the filter-driven fetch starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeasonLoading(true);
    const params = selectedIndustries.length > 0
      ? `?industries=${selectedIndustries.join(',')}` : '';
    fetch(`/api/seasonality${params}`)
      .then((r) => r.json())
      .then(setSeasonality)
      .catch(console.error)
      .finally(() => setSeasonLoading(false));
  }, [selectedIndustries]);

  function toggleIndustry(ind: string) {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">시즌 인사이트</h1>
        <p className="text-sm text-gray-500 mt-1">시즌 이벤트 전·중·후 성과 변화와 월별 추이를 분석합니다.</p>
      </div>

      {/* ══ 시즈널리티 분석 ══ */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800">시즌 이벤트 전·중·후 분석</h2>
            <p className="text-xs text-gray-400 mt-0.5">이벤트 기준 ±2주 데이터를 비교합니다</p>
          </div>

          {/* 업종 필터 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">업종 필터:</span>
            <button
              type="button"
              onClick={() => setSelectedIndustries([])}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedIndustries.length === 0
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              전체
            </button>
            {availableIndustries.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleIndustry(ind)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedIndustries.includes(ind)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {seasonLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
            분석 중...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {seasonality.map((event) => (
              <SeasonalityCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
