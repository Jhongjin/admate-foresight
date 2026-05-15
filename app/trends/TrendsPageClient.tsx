'use client';

import { useState, useEffect, type ReactNode } from 'react';
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

const COLORS = ['#0f766e', '#b45309', '#475569', '#be123c', '#0891b2', '#78716c'];
const GENDER_COLORS: Record<string, string> = { male: '#0e7490', female: '#b45309', unknown: '#0f766e' };
const GENDER_LABELS: Record<string, string> = { male: '남성', female: '여성', unknown: '전체' };
const AGE_COLORS = ['#0f766e', '#0891b2', '#64748b', '#78716c', '#b45309', '#be123c'];
const RANK_BADGE = ['01', '02', '03'];

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
    ? '선택 업종을 줄이거나 전체 업종 기준으로 되돌려 검토 범위를 넓혀 보세요.'
    : '목표 필터를 해제하거나 최근 6개월 벤치마크 적재 상태를 확인해 주세요.';
  return `${scope} 검토 행이 아직 없습니다. ${industryHint}`;
}

function chartEmptyLedger(scope: string, selectedIndustries: string[]) {
  return [
    { label: '기준 기간', value: '최근 6개월', detail: '기본 계획 기준선' },
    {
      label: '세그먼트 범위',
      value: selectedIndustries.length > 0 ? `${selectedIndustries.length}개 업종 선택` : '업종 전체',
      detail: selectedIndustries.length > 0 ? '필터가 좁아진 상태' : '비교 범위 넓게 유지',
    },
    {
      label: '다음 점검',
      value: selectedIndustries.length > 0 ? '업종 필터 완화' : '목표 필터 점검',
      detail: `${scope} 판단 전 입력 범위 확인`,
    },
  ];
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
    <div className="w-full sm:w-64 lg:w-56">
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

function SignalPill({ label, value, tone }: { label: string; value: string; tone: 'ready' | 'watch' | 'idle' }) {
  const toneClass = {
    ready: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    watch: 'border-amber-200 bg-amber-50 text-amber-800',
    idle: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];

  return (
    <div className={`min-w-0 rounded-md border px-2.5 py-2 sm:px-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-70">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function SectionShell({
  title,
  caption,
  action,
  children,
  className = '',
}: {
  title: string;
  caption: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">계획 근거</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{caption}</p>
        </div>
        {action && <div className="w-full shrink-0 sm:w-auto">{action}</div>}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function ForecastEmptyPanel({
  title,
  description,
  eyebrow = '기준선 대기',
  ledger = chartEmptyLedger('벤치마크', []),
}: {
  title: string;
  description: string;
  eyebrow?: string;
  ledger?: Array<{ label: string; value: string; detail: string }>;
}) {
  return (
    <div
      role="region"
      aria-label={title}
      className="relative flex min-h-[15rem] overflow-hidden rounded-md border border-dashed border-stone-300 bg-[#f7f5ef] px-4 py-5 sm:min-h-64 sm:px-5 sm:py-6"
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
      <div className="relative grid w-full gap-4 md:grid-cols-[1.1fr_0.9fr] md:items-center">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-500">{eyebrow}</p>
          <h3 className="mt-2 text-base font-semibold text-slate-950 sm:text-lg">{title}</h3>
          <p className="mt-2 max-w-md text-xs leading-5 text-slate-600 sm:text-sm sm:leading-6">{description}</p>
          <div className="mt-4 flex flex-wrap gap-1.5 sm:mt-5 sm:gap-2">
            {['최근 6개월', '필터 검토', '기획 메모'].map((item) => (
              <span key={item} className="rounded-md border border-stone-300 bg-white/75 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-600 sm:text-[11px]">
                {item}
              </span>
            ))}
          </div>
          <p className="mt-3 border-t border-stone-200 pt-2 text-[11px] leading-5 text-stone-500">
            빈 차트는 실패가 아니라 기준선 판단을 보류한 상태입니다.
          </p>
        </div>
        <div className="rounded-md border border-stone-300 bg-white/75 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3 border-b border-stone-200 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">준비 상태</p>
            <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-800">
              행 대기
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {ledger.map((item) => (
              <div key={item.label} className="grid gap-1 rounded-md border border-stone-200 bg-[#fbfaf7] px-3 py-2 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">{item.label}</p>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-950">{item.value}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanningLedgerCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'teal' | 'amber' | 'stone' | 'slate';
}) {
  const toneClass = {
    teal: 'border-teal-200 bg-teal-50 text-teal-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    stone: 'border-stone-200 bg-stone-50 text-stone-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  }[tone];

  return (
    <div className={`min-w-0 rounded-md border p-3 sm:p-4 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] opacity-70">{label}</p>
      <p className="mt-2 truncate text-sm font-bold text-slate-950 sm:text-base">{value}</p>
      <p className="mt-2 text-xs leading-5 opacity-80">{detail}</p>
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
  const segmentReadiness = availableIndustries.length > 0 || availableObjectives.length > 0
    ? `업종 ${availableIndustries.length.toLocaleString()}개 / 목표 ${availableObjectives.length.toLocaleString()}개`
    : '필터 목록 대기';
  const missingInputLedger = filtersError
    ? '필터 연결 확인'
    : activeFilterCount > 0
      ? `${activeFilterCount}개 선택 입력`
      : '선택 입력 없음';
  const nextPlanningAction = trendError || efficiencyError || genderError || ageError
    ? '연결 상태 재확인'
    : !loading && trendChartData.length === 0
      ? '필터 완화 후 재검토'
      : top3.length > 0
        ? '효율 랭킹 비교'
        : '기준선 적재 대기';

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
    <div className="space-y-4 text-slate-950 sm:space-y-5">
      <section className="overflow-hidden rounded-md border border-slate-200 bg-[#f8f6f0] shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 p-4 sm:p-6 lg:p-7">
            <p className="inline-flex rounded-md border border-teal-200 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">
              매체 계획 관제
            </p>
            <h1 className="mt-4 max-w-3xl text-2xl font-bold leading-tight text-slate-950 sm:text-4xl">
              업종별 예측 기준선 스튜디오
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Meta 성과 신호를 목표, 업종, 지표별로 재조합해 플래너가 다음 예산 판단에 쓸 기준선을 확인합니다.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <SignalPill label="목표" value={objectiveContext} tone={objectives.length > 0 ? 'ready' : 'idle'} />
              <SignalPill label="지표" value={metricConfig.label} tone="ready" />
              <SignalPill label="범위" value={activeFilterCount > 0 ? `필터 ${activeFilterCount}개` : '전체 기준선'} tone="watch" />
            </div>
          </div>
          <aside className="border-t border-stone-200 bg-[#fffaf0] p-4 text-slate-950 sm:p-6 lg:border-l lg:border-t-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-800">준비도 장부</p>
            <h2 className="mt-2 text-lg font-semibold leading-snug sm:mt-3 sm:text-xl">기준선 판독 순서</h2>
            <div className="mt-4 grid gap-3 text-sm sm:mt-6">
              <div className="flex items-start gap-3 rounded-md border border-stone-200 bg-white/70 px-3 py-2">
                <span className="mt-1 h-2 w-6 rounded-full bg-teal-700" />
                <p className="text-slate-600">데이터가 없는 구간은 빈 화면이 아니라 적재 대기 상태로 표시합니다.</p>
              </div>
              <div className="flex items-start gap-3 rounded-md border border-stone-200 bg-white/70 px-3 py-2">
                <span className="mt-1 h-2 w-6 rounded-full bg-amber-500" />
                <p className="text-slate-600">CPM/CPC는 낮은 값, CTR/도달은 높은 값을 기준으로 효율을 읽습니다.</p>
              </div>
              <div className="flex items-start gap-3 rounded-md border border-stone-200 bg-white/70 px-3 py-2">
                <span className="mt-1 h-2 w-6 rounded-full bg-stone-500" />
                <p className="text-slate-600">성별/연령/월별 기준선은 동일한 필터 문맥 안에서 비교합니다.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">운영 제어면</p>
        </div>
        <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
          {filtersError && (
            <StatePanel
              variant="error"
              title="필터 정보를 불러오지 못했습니다"
              description="기본 범위로 화면을 표시합니다. 잠시 후 새로고침하거나 운영 담당자에게 문의해 주세요."
              className="min-h-32"
            />
          )}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)]">
            <div className="min-w-0 space-y-2">
              <label className="text-sm font-semibold text-slate-900">캠페인 목표</label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {availableObjectives.map((obj) => {
                  const active = objectives.includes(obj);
                  return (
                    <button
                      key={obj}
                      type="button"
                      onClick={() => selectObjective(obj)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                        active
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50'
                      }`}
                    >
                      {OBJECTIVE_LABELS[obj] ?? obj}
                    </button>
                  );
                })}
                {availableObjectives.length === 0 && (
                  <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    목표 목록 대기
                  </span>
                )}
                {objectives.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setObjectives([])}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800 sm:px-3 sm:py-2"
                  >
                    초기화
                  </button>
                )}
              </div>
              {objectives.length === 0 && <p className="text-xs text-slate-400">선택 없음 = 전체 기준선</p>}
            </div>

            <div className="min-w-0 space-y-2">
              <label className="text-sm font-semibold text-slate-900">판단 지표</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {METRIC_OPTIONS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetric(m.key)}
                    className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                      metric === m.key
                        ? 'border-slate-950 bg-slate-950 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="border-b border-slate-100 bg-[#fbfaf7] px-4 py-4 sm:px-5 lg:border-b-0 lg:border-r">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">계획 장부</p>
            <h2 className="mt-2 text-base font-bold text-slate-950">벤치마크 입력 준비도</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              현재 화면의 필터, 지표, 빈 구간을 다음 계획 액션으로 정리합니다.
            </p>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 xl:grid-cols-4">
            <PlanningLedgerCard
              label="기준 기간"
              value="최근 6개월"
              detail={`${metricConfig.label} 기준으로 월별 기준선을 확인합니다.`}
              tone="teal"
            />
            <PlanningLedgerCard
              label="세그먼트 준비"
              value={segmentReadiness}
              detail={filtersError ? '필터 목록을 불러온 뒤 세그먼트를 조정할 수 있습니다.' : '업종과 목표 필터로 계획 범위를 좁힙니다.'}
              tone={filtersError ? 'amber' : 'stone'}
            />
            <PlanningLedgerCard
              label="입력 공백"
              value={missingInputLedger}
              detail={activeFilterCount > 0 ? '선택 입력을 기준으로 각 차트를 다시 집계합니다.' : '전체 기준선에서 시작해 비교 대상을 좁혀 보세요.'}
              tone={filtersError ? 'amber' : activeFilterCount > 0 ? 'teal' : 'slate'}
            />
            <PlanningLedgerCard
              label="다음 계획 액션"
              value={nextPlanningAction}
              detail="빈 차트는 실패가 아니라 입력 범위나 적재 상태를 점검할 신호입니다."
              tone={nextPlanningAction.includes('재확인') || nextPlanningAction.includes('완화') ? 'amber' : 'slate'}
            />
          </div>
        </div>
      </section>

      {efficiencyError && (
        <StatePanel
          variant="error"
          title="효율 순위를 불러오지 못했습니다"
          description="업종별 순위 영역만 일시적으로 표시할 수 없습니다. 다른 차트는 가능한 범위에서 계속 표시됩니다."
        />
      )}
      <SectionShell
        title="업종별 효율 랭킹"
        caption={`${objectiveContext} / ${metricConfig.label} / ${
          metric === 'avgCTR' || metric === 'totalReach' ? '높을수록 효율적' : '낮을수록 효율적'
        }`}
      >
        {top3.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-[1.15fr_1fr_0.9fr]">
            {top3.map((r, i) => (
              <div key={r.industry} className="rounded-md border border-stone-200 bg-[#fbfaf7] p-4 transition-colors hover:bg-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
                    {RANK_BADGE[i]}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-500">계획 신호</span>
                </div>
                <div className="mt-5 truncate text-sm font-semibold text-slate-800">{r.industry}</div>
                <div className="mt-2 text-2xl font-bold text-teal-800">
                  {metricConfig.format((r as unknown as Record<string, number>)[metric])}
                </div>
                <div className="mt-4 grid grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-md border border-stone-200 bg-white px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-stone-500">효율 기준</p>
                  <p className="truncate text-[11px] font-semibold text-slate-700">
                    {metric === 'avgCTR' || metric === 'totalReach' ? '확장 우선 검토' : '비용 압력 낮음'}
                  </p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-teal-700"
                    style={{ width: `${i === 0 ? 86 : i === 1 ? 68 : 52}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <ForecastEmptyPanel
            title="순위 기준선 대기"
            description="목표 필터를 해제하거나 벤치마크 적재 후 다시 확인해 주세요. CPM/CPC는 낮은 값, CTR/도달은 높은 값을 기준으로 정렬합니다."
            eyebrow="순위 판단"
            ledger={[
              { label: '기준 기간', value: '최근 6개월', detail: '효율 순위 기본 기준' },
              { label: '목표 범위', value: objectiveContext, detail: objectives.length > 0 ? '목표별 비교 중' : '전체 목표 기준' },
              { label: '다음 점검', value: '목표 필터 점검', detail: '순위 판단 전 비교 범위 확인' },
            ]}
          />
        )}
      </SectionShell>

      <SectionShell
        title={`월별 ${metricConfig.label} 추이`}
        caption={`${objectiveContext} / ${trendIndustryContext}`}
        action={
          <ChartIndustryFilter
            availableIndustries={availableIndustries}
            selected={trendIndustries}
            onChange={setTrendIndustries}
          />
        }
      >
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
          <ForecastEmptyPanel
            title="월별 기준선 대기"
            description={chartEmptyDescription('월별 추이', trendIndustries)}
            eyebrow="기준 기간"
            ledger={chartEmptyLedger('월별 추이', trendIndustries)}
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="h-[240px] min-w-[540px] sm:h-[280px] sm:min-w-[640px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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
      </SectionShell>

      {summaryRows.length > 0 && (
        <SectionShell
          title={`업종별 최신 ${metricConfig.label} 비교`}
          caption={`${trendIndustryContext} / 월별 추이와 동일한 업종 기준`}
          className="bg-[#fbfaf7]"
        >
          <div className="overflow-x-auto">
            <div className="h-[210px] min-w-[520px] sm:h-[220px] sm:min-w-[560px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryRows} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="industry" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(v)} width={80} />
                  <Tooltip formatter={(v) => metricConfig.format(Number(v))} />
                  <Bar dataKey={metric} radius={[3, 3, 0, 0]}>
                    {summaryRows.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionShell>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionShell
          title={`성별 ${metricConfig.label} 분포`}
          caption={`${objectiveContext} / ${genderIndustryContext}`}
          action={
            <ChartIndustryFilter
              availableIndustries={availableIndustries}
              selected={genderIndustries}
              onChange={setGenderIndustries}
            />
          }
        >
          {genderChartData.length === 0 ? (
            genderError ? (
              <StatePanel
                variant="error"
                title="성별 분포를 불러오지 못했습니다"
                description="일시적으로 성별 비교 데이터를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."
                className="h-64"
              />
            ) : (
              <ForecastEmptyPanel
                title="성별 기준선 대기"
                description={chartEmptyDescription('성별 분포', genderIndustries)}
                eyebrow="세그먼트 준비"
                ledger={chartEmptyLedger('성별 분포', genderIndustries)}
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <div className="h-[230px] min-w-[520px] sm:h-[260px] sm:min-w-[560px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={genderChartData} barGap={6} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="industry" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(Number(v))} width={80} />
                    <Tooltip formatter={(v) => [metricConfig.format(Number(v)), '']} />
                    <Legend formatter={(v) => GENDER_LABELS[v] ?? v} />
                    {genderGroups.map((g) => (
                      <Bar key={g} dataKey={g} name={GENDER_LABELS[g] ?? g} fill={GENDER_COLORS[g] ?? '#475569'} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </SectionShell>

        <SectionShell
          title={`연령대별 ${metricConfig.label} 분포`}
          caption={`${objectiveContext} / ${ageIndustryContext}`}
          action={
            <ChartIndustryFilter
              availableIndustries={availableIndustries}
              selected={ageIndustries}
              onChange={setAgeIndustries}
            />
          }
        >
          {ageChartData.length === 0 ? (
            ageError ? (
              <StatePanel
                variant="error"
                title="연령대별 분포를 불러오지 못했습니다"
                description="일시적으로 연령대 비교 데이터를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요."
                className="h-64"
              />
            ) : (
              <ForecastEmptyPanel
                title="연령대 기준선 대기"
                description={chartEmptyDescription('연령대 분포', ageIndustries)}
                eyebrow="오디언스 범위"
                ledger={chartEmptyLedger('연령대 분포', ageIndustries)}
              />
            )
          ) : (
            <div className="overflow-x-auto">
              <div className="h-[230px] min-w-[540px] sm:h-[260px] sm:min-w-[640px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageChartData} barGap={4} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="industry" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => metricConfig.format(Number(v))} width={80} />
                    <Tooltip formatter={(v) => [metricConfig.format(Number(v)), '']} />
                    <Legend />
                    {ageGroups.map((a, i) => (
                      <Bar key={a} dataKey={a} fill={AGE_COLORS[i % AGE_COLORS.length]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </SectionShell>
      </div>

      <section className="overflow-hidden rounded-md border border-teal-200 bg-teal-50 shadow-sm">
        <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_260px]">
          <div className="p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal-800">소재 맥락</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">벤치마크 수치와 소재 맥락을 함께 확인하세요</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              업종 기준선이 비어 있거나 변동 폭이 큰 경우, 경쟁사 소재 보드에서 같은 시장의 메시지와 크리에이티브 흐름을 먼저 확인합니다.
            </p>
          </div>
          <div className="border-t border-teal-200 bg-white/70 p-5 md:border-l md:border-t-0">
            <a
              href="/competitor"
              className="inline-flex w-full items-center justify-center rounded-md bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              경쟁사 소재 보드 열기
            </a>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Meta 라이브러리 기반 소재 관찰 화면으로 이동합니다.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
