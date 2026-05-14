'use client';

interface KPICardProps {
  title: string;
  value: string;         // 내 예측 (포맷팅 완료)
  icon: string;
  loading?: boolean;
  // 업종 평균 비교 (옵션)
  // marketLabel = undefined → 업종 평균 행 미표시 (해당 없는 지표)
  // marketLabel = '-'       → 업종 미선택 표시
  // marketLabel = 값        → 업종 평균 수치 표시 + diff 배지
  marketLabel?: string;
  diff?: number | null;   // (내 예측 - 업종평균) / 업종평균 × 100
  lowerBetter?: boolean;  // true = CPM·CPC, false = 도달·VTR
  benchmarkStatusLabel?: string;
  benchmarkBasisLines?: string[];
  benchmarkConfidenceLabel?: string;
  benchmarkVisibleCopy?: string[];
  benchmarkSyntheticContextLabel?: string;
  benchmarkBlockedOutputs?: string[];
}

/**
 * 금액·수치 문자열에서 접두 기호, 숫자, 접미 단위를 분리합니다.
 * "₩4,500" → { prefix:"₩", number:"4,500", suffix:"" }
 * "154.6만명" → { prefix:"", number:"154.6", suffix:"만명" }
 */
function splitValue(val: string) {
  if (val === '—' || val === '-') return { prefix: '', number: val, suffix: '' };
  const m = val.match(/^([₩$€£]?)([0-9,.]+)(.*)/);
  if (!m) return { prefix: '', number: val, suffix: '' };
  return { prefix: m[1], number: m[2], suffix: m[3] };
}

function splitBenchmarkBasisLine(line: string) {
  const separatorIndex = line.indexOf(':');

  if (separatorIndex === -1) {
    return { term: '기준', description: line };
  }

  return {
    term: line.slice(0, separatorIndex).trim(),
    description: line.slice(separatorIndex + 1).trim(),
  };
}

export default function KPICard({
  title, value, icon, loading,
  marketLabel, diff, lowerBetter = false,
  benchmarkStatusLabel,
  benchmarkBasisLines = [],
  benchmarkConfidenceLabel,
  benchmarkVisibleCopy = [],
  benchmarkSyntheticContextLabel,
  benchmarkBlockedOutputs = [],
}: KPICardProps) {
  const { prefix, number, suffix } = splitValue(value);

  // diff 배지
  const hasDiff = diff != null && marketLabel && marketLabel !== '-';
  const isGood   = hasDiff ? (lowerBetter ? diff! < 0 : diff! > 0) : false;
  const isNeutral = hasDiff ? Math.abs(diff!) < 2 : false;
  const diffDirectionLabel = diff != null && diff > 0 ? '평균보다 높음' : '평균보다 낮음';
  const diffQualityLabel = isNeutral ? '평균 수준' : isGood ? '유리한 지표' : '주의 지표';
  const diffBadgeLabel = hasDiff
    ? isNeutral
      ? '업종 평균과 비슷함'
      : `업종 ${diffDirectionLabel} ${Math.abs(diff!).toFixed(1)}%, ${diffQualityLabel}`
    : undefined;
  const hasBenchmarkDisplay = !loading && Boolean(
    benchmarkStatusLabel
      || benchmarkConfidenceLabel
      || benchmarkSyntheticContextLabel
      || benchmarkBasisLines.length
      || benchmarkVisibleCopy.length
      || benchmarkBlockedOutputs.length,
  );

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      {/* 상단: 아이콘 + diff 배지 */}
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md border border-stone-200 bg-stone-50 px-2 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-700 leading-none">
          {icon}
        </span>
        {hasDiff && (
          <span
            aria-label={diffBadgeLabel}
            className={`max-w-[70%] whitespace-normal break-words rounded-md border px-2 py-0.5 text-xs font-semibold tracking-tight ${
              isNeutral
                ? 'border-gray-200 bg-gray-50 text-gray-500'
                : isGood
                ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border-red-100 bg-red-50 text-red-600'
            }`}
          >
            {isNeutral ? '평균 수준' : `${diffDirectionLabel} ${Math.abs(diff!).toFixed(1)}%`}
          </span>
        )}
      </div>

      {/* 타이틀 */}
      <div className="-mb-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Planner KPI</p>
        <p className="mt-1 text-xs font-semibold text-[#4B5563]">{title}</p>
      </div>

      {/* 내 예측 수치 */}
      {loading ? (
        <div className="h-8 w-28 animate-pulse rounded-md bg-gray-100" />
      ) : (
        <p className="leading-none">
          {prefix && (
            <span className="text-lg font-bold text-[#6B7280] mr-0.5">{prefix}</span>
          )}
          <span className="text-[1.75rem] font-bold text-[#111827] num">{number}</span>
          {suffix && (
            <span className="text-sm font-semibold text-[#6B7280] ml-0.5">{suffix}</span>
          )}
        </p>
      )}

      {/* 업종 평균 */}
      {marketLabel !== undefined && !loading && (
        <p className="mt-auto border-t border-slate-100 pt-2 text-xs text-[#6B7280]">
          Benchmark line{' '}
          <span className={`font-semibold num ${marketLabel === '-' ? 'text-gray-400' : 'text-[#374151]'}`}>
            {marketLabel}
          </span>
        </p>
      )}

      {hasBenchmarkDisplay && (
        <section
          aria-label={`${title} 벤치마크 신뢰도 세부 정보`}
          className="min-w-0 space-y-2 border-t border-slate-100 pt-3"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-stone-500">Planning ledger</p>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            {benchmarkStatusLabel && (
              <p
                role="status"
                aria-label={`벤치마크 상태: ${benchmarkStatusLabel}`}
                className="min-w-0 flex-1 text-[11px] font-semibold text-[#111827] leading-snug break-words"
              >
                <span className="sr-only">벤치마크 상태: </span>
                {benchmarkStatusLabel}
              </p>
            )}
            {benchmarkSyntheticContextLabel && (
              <span className="max-w-full whitespace-normal break-words rounded-md border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-[10px] font-semibold text-stone-600">
                <span className="sr-only">벤치마크 기준: </span>
                {benchmarkSyntheticContextLabel}
              </span>
            )}
          </div>

          {benchmarkConfidenceLabel && (
            <p
              aria-label={`벤치마크 신뢰도: ${benchmarkConfidenceLabel}`}
              className="text-[11px] text-[#4B5563] leading-snug break-words"
            >
              <span className="sr-only">벤치마크 신뢰도: </span>
              {benchmarkConfidenceLabel}
            </p>
          )}

          {benchmarkVisibleCopy.length > 0 && (
            <ul aria-label={`${title} 벤치마크 안내`} className="space-y-1">
              {benchmarkVisibleCopy.map((line) => (
                <li key={line} className="text-[11px] text-[#4B5563] leading-snug break-words">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {benchmarkBasisLines.length > 0 && (
            <dl aria-label={`${title} 벤치마크 기준`} className="grid grid-cols-1 gap-1">
              {benchmarkBasisLines.map((line) => {
                const { term, description } = splitBenchmarkBasisLine(line);

                return (
                  <div key={line} className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-1.5 text-[11px] leading-snug text-[#6B7280]">
                    <dt className="font-medium text-[#4B5563]">{term}</dt>
                    <dd className="min-w-0 break-words">{description}</dd>
                  </div>
                );
              })}
            </dl>
          )}

          {benchmarkBlockedOutputs.length > 0 && (
            <div className="rounded-md border border-red-100 bg-red-50 px-2 py-1.5 text-[11px] leading-snug text-[#991B1B]">
              <p className="font-semibold">제한된 출력 · Blocked planner output</p>
              <ul
                aria-label={`${title} 제한된 벤치마크 출력`}
                className="mt-1 list-disc space-y-1 pl-4"
              >
                {benchmarkBlockedOutputs.map((output) => (
                  <li key={output} className="break-words">
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
