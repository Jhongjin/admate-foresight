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
    return { term: 'Basis', description: line };
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
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
      {/* 상단: 아이콘 + diff 배지 */}
      <div className="flex items-center justify-between">
        <span className="text-xl leading-none">{icon}</span>
        {hasDiff && (
          <span
            aria-label={diffBadgeLabel}
            className={`max-w-[70%] whitespace-normal break-words text-xs font-semibold tracking-tight px-2 py-0.5 rounded-full ${
              isNeutral
                ? 'bg-gray-100 text-gray-500'
                : isGood
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-red-50 text-red-500'
            }`}
          >
            {isNeutral ? '평균 수준' : `${diffDirectionLabel} ${Math.abs(diff!).toFixed(1)}%`}
          </span>
        )}
      </div>

      {/* 타이틀 */}
      <p className="text-xs font-medium text-[#6B7280] -mb-1">{title}</p>

      {/* 내 예측 수치 */}
      {loading ? (
        <div className="h-8 w-28 bg-gray-100 rounded-lg animate-pulse" />
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
        <p className="text-xs text-[#6B7280] border-t border-gray-50 pt-2 mt-auto">
          업종 평균{' '}
          <span className={`font-semibold num ${marketLabel === '-' ? 'text-gray-400' : 'text-[#374151]'}`}>
            {marketLabel}
          </span>
        </p>
      )}

      {hasBenchmarkDisplay && (
        <section
          aria-label={`${title} benchmark trust details`}
          className="min-w-0 border-t border-gray-100 pt-3 space-y-2"
        >
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            {benchmarkStatusLabel && (
              <p
                role="status"
                aria-label={`Benchmark status: ${benchmarkStatusLabel}`}
                className="min-w-0 flex-1 text-[11px] font-semibold text-[#111827] leading-snug break-words"
              >
                <span className="sr-only">Benchmark status: </span>
                {benchmarkStatusLabel}
              </p>
            )}
            {benchmarkSyntheticContextLabel && (
              <span className="max-w-full whitespace-normal break-words text-[10px] font-medium text-[#4F46E5] bg-indigo-50 px-1.5 py-0.5 rounded-md">
                <span className="sr-only">Benchmark context: </span>
                {benchmarkSyntheticContextLabel}
              </span>
            )}
          </div>

          {benchmarkConfidenceLabel && (
            <p
              aria-label={`Benchmark confidence: ${benchmarkConfidenceLabel}`}
              className="text-[11px] text-[#4B5563] leading-snug break-words"
            >
              <span className="sr-only">Benchmark confidence: </span>
              {benchmarkConfidenceLabel}
            </p>
          )}

          {benchmarkVisibleCopy.length > 0 && (
            <ul aria-label={`${title} benchmark notes`} className="space-y-1">
              {benchmarkVisibleCopy.map((line) => (
                <li key={line} className="text-[11px] text-[#4B5563] leading-snug break-words">
                  {line}
                </li>
              ))}
            </ul>
          )}

          {benchmarkBasisLines.length > 0 && (
            <dl aria-label={`${title} benchmark basis`} className="grid grid-cols-1 gap-1">
              {benchmarkBasisLines.map((line) => {
                const { term, description } = splitBenchmarkBasisLine(line);

                return (
                  <div key={line} className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-1 text-[11px] text-[#6B7280] leading-snug">
                    <dt className="font-medium text-[#4B5563]">{term}</dt>
                    <dd className="min-w-0 break-words">{description}</dd>
                  </div>
                );
              })}
            </dl>
          )}

          {benchmarkBlockedOutputs.length > 0 && (
            <div className="text-[11px] text-[#991B1B] leading-snug">
              <p className="font-medium">Blocked outputs</p>
              <ul
                aria-label={`${title} blocked benchmark outputs`}
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
