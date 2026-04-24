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

export default function KPICard({
  title, value, icon, loading,
  marketLabel, diff, lowerBetter = false,
}: KPICardProps) {
  const { prefix, number, suffix } = splitValue(value);

  // diff 배지
  const hasDiff = diff != null && marketLabel && marketLabel !== '-';
  const isGood   = hasDiff ? (lowerBetter ? diff! < 0 : diff! > 0) : false;
  const isNeutral = hasDiff ? Math.abs(diff!) < 2 : false;
  const arrow    = diff != null && diff > 0 ? '▲' : '▼';

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3">
      {/* 상단: 아이콘 + diff 배지 */}
      <div className="flex items-center justify-between">
        <span className="text-xl leading-none">{icon}</span>
        {hasDiff && (
          <span className={`text-xs font-semibold tracking-tight px-2 py-0.5 rounded-full ${
            isNeutral
              ? 'bg-gray-100 text-gray-500'
              : isGood
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-500'
          }`}>
            {isNeutral ? '평균' : `${arrow} ${Math.abs(diff!).toFixed(1)}%`}
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
    </div>
  );
}
