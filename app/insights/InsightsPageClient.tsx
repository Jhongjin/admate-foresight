'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import StatePanel from '@/components/StatePanel';

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

function toJsonOrThrow(response: Response) {
  if (!response.ok) throw new Error('request_failed');
  return response.json();
}

/* ── 변화율 뱃지 ── */
function ChangeBadge({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <span className="text-xs text-slate-300">-</span>;
  const color = value > 0
    ? (inverse ? 'border-red-100 bg-red-50 text-red-600' : 'border-emerald-100 bg-emerald-50 text-emerald-700')
    : (inverse ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-red-100 bg-red-50 text-red-600');
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-xs font-semibold ${color}`}>
      {value > 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

/* ── 시즈널리티 카드 ── */
function SeasonalityCard({ event }: { event: SeasonalityEvent }) {
  const periods = [
    { key: 'before', label: '2주 전', data: event.before, bg: 'bg-stone-50', border: 'border-stone-200' },
    { key: 'during', label: '시즌 중', data: event.during, bg: 'bg-amber-50', border: 'border-amber-300' },
    { key: 'after',  label: '2주 후',  data: event.after,  bg: 'bg-teal-50',  border: 'border-teal-200' },
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
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfaf6] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-lg">{event.emoji}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">Seasonality window</p>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-950">{event.name}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{event.description} · {event.eventStart}{event.eventStart !== event.eventEnd ? ` ~ ${event.eventEnd}` : ''}</p>
          </div>
        </div>
        {event.during.count === 0 && (
          <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">시즌 중 데이터 없음</span>
        )}
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {/* 3구간 비교 카드 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {periods.map(({ key, label, data, bg, border }) => (
            <div key={key} className={`rounded-md border ${border} ${bg} p-3 sm:p-4`}>
              <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
              <p className="mb-3 text-xs text-slate-400">{data.dateRange}</p>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-400">CPM</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.avgCPM > 0 ? `₩${data.avgCPM.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">CPC</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.avgCPC > 0 ? `₩${data.avgCPC.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">CTR</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.avgCTR > 0 ? `${data.avgCTR.toFixed(3)}%` : '-'}
                  </p>
                </div>
                {data.avgVTR > 0 && (
                  <div>
                    <p className="text-xs text-slate-400">VTR</p>
                    <p className="text-sm font-bold text-slate-900">{data.avgVTR.toFixed(3)}%</p>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1">
                  <p className="text-xs text-slate-400">벤치마크 행</p>
                  <p className="text-xs text-slate-600">{data.count.toLocaleString()}건</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 전 대비 변화율 요약 */}
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">2주 전 대비 시즌 압력</p>
          <div className="flex flex-wrap gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5">
                <span className="text-xs font-semibold text-slate-500">{m.label}</span>
                <ChangeBadge value={m.change} inverse={m.inverse} />
              </div>
            ))}
          </div>
          {event.cpmChange !== null && (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {event.cpmChange > 0
                ? `시즌 중 CPM이 ${event.cpmChange}% 상승했습니다. 동일 예산 대비 도달 압력을 보수적으로 검토하세요.`
                : `시즌 중 CPM이 ${Math.abs(event.cpmChange ?? 0)}% 하락했습니다. 효율 개선 구간인지 추가 확인하세요.`}
            </p>
          )}
        </div>

        {/* CPM/CPC 막대 차트 */}
        {event.during.count > 0 && (
          <div>
            <p className="mb-3 text-xs font-semibold text-slate-600">구간별 CPM / CPC 비교</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₩${(v/1000).toFixed(0)}K`} width={52} />
                <Tooltip formatter={(v) => [`₩${Number(v).toLocaleString()}`, '']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="CPM" fill="#0f766e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="CPC" fill="#b45309" radius={[3, 3, 0, 0]} />
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
  const [filtersError, setFiltersError] = useState(false);
  const [seasonError, setSeasonError] = useState(false);
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/insights')
      .then(toJsonOrThrow)
      .then((d) => {
        setFiltersError(false);
        const inds = [...new Set((d as SeasonInsight[]).map((x) => x.industry))].sort();
        setAvailableIndustries(inds);
      })
      .catch(() => setFiltersError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Loading state intentionally resets whenever the filter-driven fetch starts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSeasonLoading(true);
    const params = selectedIndustries.length > 0
      ? `?industries=${selectedIndustries.join(',')}` : '';
    fetch(`/api/seasonality${params}`)
      .then(toJsonOrThrow)
      .then((data) => {
        setSeasonError(false);
        setSeasonality(data);
      })
      .catch(() => {
        setSeasonality([]);
        setSeasonError(true);
      })
      .finally(() => setSeasonLoading(false));
  }, [selectedIndustries]);

  function toggleIndustry(ind: string) {
    setSelectedIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  }

  if (loading) {
    return (
      <StatePanel
        variant="loading"
        title="시즌 인사이트를 준비하고 있습니다"
        description="사용 가능한 업종과 시즌 분석 범위를 확인하는 중입니다."
        className="h-64"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-slate-200 bg-[#f8f6f0] p-5 shadow-sm sm:p-6">
        <p className="inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
          Seasonality desk
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">시즌 압력 플래너</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          이벤트 전·중·후 CPM, CPC, CTR, VTR 변화를 같은 기간 창으로 묶어 예산 압력과 집행 타이밍을 점검합니다.
        </p>
      </section>

      {/* ══ 시즈널리티 분석 ══ */}
      <div>
        {filtersError && (
          <StatePanel
            variant="error"
            title="업종 필터를 불러오지 못했습니다"
            description="전체 범위 기준으로 시즌 인사이트를 표시합니다. 잠시 후 새로고침하거나 운영 담당자에게 문의해 주세요."
            className="mb-5 min-h-32"
          />
        )}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">시즌 이벤트 전·중·후 분석</h2>
            <p className="mt-0.5 text-xs text-slate-500">이벤트 기준 ±2주 데이터를 비교합니다</p>
          </div>

          {/* 업종 필터 */}
          <div className="flex max-w-full flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">업종 필터</span>
            <button
              type="button"
              onClick={() => setSelectedIndustries([])}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                selectedIndustries.length === 0
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
              }`}
            >
              전체
            </button>
            {availableIndustries.map((ind) => (
              <button
                key={ind}
                type="button"
                onClick={() => toggleIndustry(ind)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors ${
                  selectedIndustries.includes(ind)
                    ? 'border-teal-700 bg-teal-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'
                }`}
              >
                {ind}
              </button>
            ))}
          </div>
        </div>

        {seasonLoading ? (
          <StatePanel
            variant="loading"
            title="시즌 이벤트 성과를 분석하고 있습니다"
            description="선택한 업종의 이벤트 전후 지표를 비교 중입니다."
          />
        ) : seasonError ? (
          <StatePanel
            variant="error"
            title="시즌 이벤트 성과를 불러오지 못했습니다"
            description="일시적으로 시즌 분석 데이터를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."
          />
        ) : seasonality.length === 0 ? (
          <StatePanel
            variant="empty"
            title="시즌 압력 기준선이 아직 열리지 않았습니다"
            description="업종 필터를 줄이거나 전체 업종으로 변경해 이벤트 전후의 검토 가능한 벤치마크 행을 확인해 보세요."
            eyebrow="Seasonality baseline"
          />
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
