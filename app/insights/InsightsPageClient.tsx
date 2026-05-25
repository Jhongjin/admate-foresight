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
  const totalRows = event.before.count + event.during.count + event.after.count;
  const pressureLabel = event.cpmChange == null
    ? '압력 미산정'
    : event.cpmChange > 12
      ? '강한 비용 압력'
      : event.cpmChange > 0
        ? '비용 압력 관찰'
        : '압력 완화 가능';
  const pressureTone = event.cpmChange == null
    ? 'border-stone-200 bg-stone-50 text-stone-600'
    : event.cpmChange > 12
      ? 'border-red-100 bg-red-50 text-red-700'
      : event.cpmChange > 0
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-100 bg-emerald-50 text-emerald-700';

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 border-b border-stone-200 bg-[#fbfaf6] px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-[11px] font-bold uppercase tracking-[0.08em] text-stone-600">SE</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">시즌 압력 창</p>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-950">{event.name}</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">{event.description} · {event.eventStart}{event.eventStart !== event.eventEnd ? ` ~ ${event.eventEnd}` : ''}</p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex flex-wrap gap-2">
            <span className={`w-fit rounded-md border px-2 py-1 text-xs font-semibold ${pressureTone}`}>{pressureLabel}</span>
            <span className="w-fit rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-600">
              표본 {totalRows.toLocaleString()}건
            </span>
            {event.during.count === 0 && (
              <span className="w-fit rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">시즌 중 행 없음</span>
            )}
          </div>
          <p className="text-[11px] font-medium text-stone-500 sm:text-right">전후 창을 같은 기준으로 잠근 상태</p>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        {/* 3구간 비교 장부 */}
        <div className="overflow-hidden rounded-md border border-stone-200 bg-[#fbfaf7]">
          <div className="border-b border-stone-200 px-3 py-2 sm:px-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">기간별 벤치마크 장부</p>
          </div>
          <div className="grid divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {periods.map(({ key, label, data, bg, border }) => (
            <div key={key} className={`${bg} px-3 py-3 sm:px-4`}>
              <div className={`mb-3 border-b pb-2 ${border}`}>
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{data.dateRange}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">CPM</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.avgCPM > 0 ? `₩${data.avgCPM.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">CPC</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.avgCPC > 0 ? `₩${data.avgCPC.toLocaleString()}` : '-'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">CTR</p>
                  <p className="text-sm font-bold text-slate-900">
                    {data.avgCTR > 0 ? `${data.avgCTR.toFixed(3)}%` : '-'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">행 수</p>
                  <p className="text-sm font-bold text-slate-900">{data.count.toLocaleString()}건</p>
                </div>
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* 전 대비 변화율 요약 */}
        <div className="rounded-md border border-stone-200 bg-white px-3 py-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-700">2주 전 대비 시즌 압력</p>
            <span className="text-[11px] font-medium text-stone-500">비용 지표는 낮을수록 안정</span>
          </div>
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
        {event.during.count > 0 ? (
          <div className="rounded-md border border-stone-200 bg-[#fbfaf7] p-3">
            <p className="mb-3 text-xs font-semibold text-slate-700">구간별 CPM / CPC 비교</p>
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
        ) : (
          <div className="rounded-md border border-dashed border-stone-300 bg-[#fbfaf7] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">차트 보류</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">시즌 중 행이 없어 막대 비교를 잠시 닫았습니다</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              전후 기간 수치만으로 압력을 단정하지 않고, 시즌 중 벤치마크 행이 확보되면 CPM/CPC 차트를 엽니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonEmptyPanel({ selectedCount }: { selectedCount: number }) {
  const ledger = [
    {
      label: '범위 상태',
      value: selectedCount > 0 ? `${selectedCount}개 업종 선택` : '전체 업종',
      detail: selectedCount > 0 ? '필터가 좁아진 상태' : '검토 범위 넓게 유지',
    },
    { label: '비교 창', value: '전 2주 / 시즌 중 / 후 2주', detail: '동일 이벤트 기간 기준' },
    { label: '다음 액션', value: selectedCount > 0 ? '필터 완화' : '적재 상태 확인', detail: '검토 가능한 행 확보 후 압력 판단' },
  ];
  const pressureProtocol = [
    {
      lane: 'BUDGET',
      title: '예산 압력',
      detail: 'CPM/CPC 상승 구간은 보수적으로 flight를 잠급니다.',
    },
    {
      lane: 'RESPONSE',
      title: '반응 신호',
      detail: 'CTR/VTR 반응은 증액보다 메시지 검증에 먼저 연결합니다.',
    },
    {
      lane: 'WINDOW',
      title: '집행 창',
      detail: '전, 중, 후 기간이 모두 열릴 때 시즌 압력을 확정합니다.',
    },
  ];

  return (
    <section
      aria-label="시즌 압력 기준선 대기"
      className="relative overflow-hidden rounded-md border border-dashed border-stone-300 bg-[#f7f5ef] p-5 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(120,113,108,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">시즌 기준선 대기</p>
          <h3 className="mt-2 text-lg font-bold text-slate-950">집행 압력 판단을 보류한 상태입니다</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            이벤트 전후 비교 행이 충분히 열리면 CPM/CPC 압력과 CTR/VTR 반응을 같은 창에서 확인합니다.
          </p>
          <div className="mt-4 overflow-hidden rounded-md border border-stone-300 bg-white/75">
            <div className="border-b border-stone-200 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">Season planning protocol</p>
            </div>
            <div className="grid divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {pressureProtocol.map((item) => (
                <div key={item.lane} className="min-w-0 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-amber-800">{item.lane}</p>
                  <p className="mt-1 text-xs font-bold text-slate-950">{item.title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-5 text-stone-500">
            빈 화면을 임의 수치로 채우지 않고, 필터 범위와 적재 상태를 먼저 확인합니다.
          </p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white/80 p-3">
          <div className="flex items-center justify-between border-b border-stone-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">확인 장부</p>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">행 대기</span>
          </div>
          <div className="mt-3 grid gap-2">
            {ledger.map((item) => (
              <div key={item.label} className="rounded-md border border-stone-200 bg-[#fbfaf7] px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                <p className="mt-1 text-xs font-bold text-slate-950">{item.value}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-800">Planner note</p>
            <p className="mt-1 text-[11px] leading-5 text-amber-900">
              시즌 행이 확보되면 비용 압력, 반응 신호, 집행 창 순서로 예산 타이밍을 정리합니다.
            </p>
          </div>
        </div>
      </div>
    </section>
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

  const selectedScope = selectedIndustries.length > 0 ? `${selectedIndustries.length}개 업종 선택` : '전체 업종';
  const seasonReadiness = [
    {
      label: '검토 범위',
      value: selectedScope,
      detail: selectedIndustries.length > 0 ? selectedIndustries.slice(0, 2).join(', ') : '시장 전체 압력 기준',
    },
    {
      label: '이벤트 창',
      value: seasonLoading ? '집계 중' : seasonality.length > 0 ? `${seasonality.length}개 이벤트` : '행 대기',
      detail: '전 2주 / 시즌 중 / 후 2주 비교',
    },
    {
      label: '다음 판단',
      value: seasonError ? '연결 확인' : seasonality.length > 0 ? '압력 구간 검토' : '필터 범위 점검',
      detail: seasonality.length > 0 ? '예산 압력과 반응 지표를 함께 확인' : '검토 가능한 기준선 확보',
    },
  ];
  const seasonMethodSteps = [
    {
      step: '01',
      title: 'Scope lock',
      value: selectedScope,
      detail: '시즌 분석은 업종 범위를 먼저 고정한 뒤 이벤트 창을 읽습니다.',
      tone: 'border-teal-200 bg-teal-50 text-teal-900',
    },
    {
      step: '02',
      title: 'Window compare',
      value: '전 2주 / 시즌 중 / 후 2주',
      detail: '동일한 기간 폭을 유지해 CPM/CPC 압력 왜곡을 줄입니다.',
      tone: 'border-amber-200 bg-amber-50 text-amber-900',
    },
    {
      step: '03',
      title: 'Reaction check',
      value: seasonality.length > 0 ? `${seasonality.length}개 이벤트` : '행 대기',
      detail: 'CTR/VTR 반응은 증액 판단보다 메시지 검증 신호로 먼저 봅니다.',
      tone: 'border-stone-200 bg-stone-50 text-stone-800',
    },
    {
      step: '04',
      title: 'Flight memo',
      value: seasonError ? '연결 확인' : seasonality.length > 0 ? '압력 구간 검토' : '필터 범위 점검',
      detail: '빈 시즌 창은 예산 타이밍을 보류하고 범위 점검으로 넘깁니다.',
      tone: 'border-slate-200 bg-slate-50 text-slate-800',
    },
  ];

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
          시즌 압력 관제
        </p>
        <h1 className="mt-4 text-2xl font-bold text-slate-950 sm:text-3xl">시즌 압력 분석</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          이벤트 전·중·후 CPM, CPC, CTR, VTR 변화를 같은 기간 창으로 묶어 예산 압력과 집행 타이밍을 점검합니다.
        </p>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border-b border-stone-200 bg-[#fbfaf7] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">Season protocol</p>
            <h2 className="mt-2 text-base font-bold text-slate-950">시즌 집행 확인법</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              비용 압력과 반응 신호를 같은 이벤트 창 안에서 분리해 읽습니다.
            </p>
          </div>
          <div className="grid divide-y divide-stone-200 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-4">
            {seasonMethodSteps.map((item) => (
              <div key={item.step} className={`min-w-0 px-4 py-4 ${item.tone}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md border border-current/20 bg-white/70 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                    {item.step}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">method</span>
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.06em]">{item.title}</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{item.value}</p>
                <p className="mt-2 text-[11px] leading-5 opacity-80">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-md border border-stone-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border-b border-stone-200 bg-[#fbfaf7] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">계획 준비도</p>
            <h2 className="mt-2 text-base font-bold text-slate-950">시즌 집행 압력 장부</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              필터, 이벤트 창, 다음 판단을 먼저 고정한 뒤 지표를 읽습니다.
            </p>
          </div>
          <div className="grid divide-y divide-stone-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {seasonReadiness.map((item) => (
              <div key={item.label} className="min-w-0 px-4 py-3 sm:px-5 sm:py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                <p className="mt-1 truncate text-sm font-bold text-slate-950">{item.value}</p>
                <p className="mt-1 text-[11px] leading-snug text-slate-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
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
          <SeasonEmptyPanel selectedCount={selectedIndustries.length} />
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
