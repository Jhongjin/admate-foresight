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
  benchmarkEvidenceLabel?: string;
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
  benchmarkEvidenceLabel,
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
      || benchmarkEvidenceLabel
      || benchmarkConfidenceLabel
      || benchmarkSyntheticContextLabel
      || benchmarkBasisLines.length
      || benchmarkVisibleCopy.length
      || benchmarkBlockedOutputs.length,
  );

  return (
    <div className="foresight-panel flex min-w-0 flex-col gap-3 rounded-2xl p-5">
      {/* 상단: 아이콘 + diff 배지 */}
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-xl border border-stone-200 bg-[#fbfaf6] px-2 text-[11px] font-black uppercase leading-none tracking-[0.06em] text-teal-900">
          {icon}
        </span>
        {hasDiff && (
          <span
            aria-label={diffBadgeLabel}
            className={`max-w-[70%] whitespace-normal break-words rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight ${
              isNeutral
                ? 'border-stone-200 bg-stone-50 text-stone-600'
                : isGood
                ? 'border-teal-100 bg-teal-50 text-teal-800'
                : 'border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {isNeutral ? '평균 수준' : `${diffDirectionLabel} ${Math.abs(diff!).toFixed(1)}%`}
          </span>
        )}
      </div>

      {/* 타이틀 */}
      <div className="-mb-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">예측 항목</p>
        <p className="mt-1 text-xs font-semibold text-slate-600">{title}</p>
      </div>

      {/* 내 예측 수치 */}
      {loading ? (
        <div className="h-8 w-28 animate-pulse rounded-xl bg-stone-200/70" />
      ) : (
        <p className="leading-none">
          {prefix && (
            <span className="mr-0.5 text-lg font-bold text-stone-500">{prefix}</span>
          )}
          <span className="num text-[1.85rem] font-black text-slate-950">{number}</span>
          {suffix && (
            <span className="ml-0.5 text-sm font-semibold text-stone-500">{suffix}</span>
          )}
        </p>
      )}

      {/* 업종 평균 */}
      {marketLabel !== undefined && !loading && (
        <p className="mt-auto border-t border-stone-200/80 pt-2 text-xs font-medium text-stone-500">
          기준선{' '}
          <span className={`num font-semibold ${marketLabel === '-' ? 'text-stone-400' : 'text-slate-700'}`}>
            {marketLabel}
          </span>
        </p>
      )}

      {hasBenchmarkDisplay && (
        <section
          aria-label={`${title} 벤치마크 신뢰도 세부 정보`}
          className="min-w-0 space-y-2 border-t border-stone-200/80 pt-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">기준 확인</p>
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            {benchmarkStatusLabel && (
              <p
                role="status"
                aria-label={`벤치마크 상태: ${benchmarkStatusLabel}`}
                className="min-w-0 flex-1 break-words text-[11px] font-semibold leading-snug text-slate-950"
              >
                <span className="sr-only">벤치마크 상태: </span>
                {benchmarkStatusLabel}
              </p>
            )}
            {benchmarkSyntheticContextLabel && (
              <span className="max-w-full whitespace-normal break-words rounded-full border border-teal-800/10 bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-900">
                <span className="sr-only">벤치마크 기준: </span>
                {benchmarkSyntheticContextLabel}
              </span>
            )}
          </div>

          {benchmarkConfidenceLabel && (
            <p
              aria-label={`벤치마크 신뢰도: ${benchmarkConfidenceLabel}`}
              className="break-words text-[11px] leading-snug text-slate-600"
            >
              <span className="sr-only">벤치마크 신뢰도: </span>
              {benchmarkConfidenceLabel}
            </p>
          )}

          {!benchmarkConfidenceLabel && benchmarkEvidenceLabel && (
            <p
              aria-label={`벤치마크 근거: ${benchmarkEvidenceLabel}`}
              className="break-words text-[11px] leading-snug text-slate-600"
            >
              <span className="sr-only">벤치마크 근거: </span>
              {benchmarkEvidenceLabel}
            </p>
          )}

          {benchmarkVisibleCopy.length > 0 && (
            <ul aria-label={`${title} 벤치마크 안내`} className="space-y-1">
              {benchmarkVisibleCopy.map((line) => (
                <li key={line} className="break-words text-[11px] leading-snug text-slate-600">
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
                  <div key={line} className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-1.5 text-[11px] leading-snug text-stone-500">
                    <dt className="font-medium text-slate-600">{term}</dt>
                    <dd className="min-w-0 break-words">{description}</dd>
                  </div>
                );
              })}
            </dl>
          )}

          {benchmarkBlockedOutputs.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50/80 px-3 py-2 text-[11px] leading-snug text-red-800">
              {/* Static contract marker: 제한된 출력 */}
              <p className="font-bold">결과 표시 제한</p>
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
