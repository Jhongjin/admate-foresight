'use client';

interface KPICardProps {
  title: string;
  value: string;
  change: number | null;
  icon: string;
  loading?: boolean;
}

/**
 * 금액/수치 문자열에서 접두 기호, 숫자, 접미 단위를 분리합니다.
 * 예) "₩4,500" → { prefix: "₩", number: "4,500", suffix: "" }
 *     "154.6만명" → { prefix: "", number: "154.6", suffix: "만명" }
 *     "2.14%"  → { prefix: "", number: "2.14", suffix: "%" }
 */
function splitValue(val: string): { prefix: string; number: string; suffix: string } {
  if (val === '—') return { prefix: '', number: '—', suffix: '' };
  const m = val.match(/^([₩$€£]?)([0-9,.]+)(.*)/);
  if (!m) return { prefix: '', number: val, suffix: '' };
  return { prefix: m[1], number: m[2], suffix: m[3] };
}

export default function KPICard({ title, value, change, icon, loading }: KPICardProps) {
  const { prefix, number, suffix } = splitValue(value);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl leading-none">{icon}</span>
        {change !== null && !loading && (
          <span
            className={`text-xs font-semibold tracking-tight px-2 py-1 rounded-full ${
              change >= 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>

      {/* 제목 */}
      <p className="text-xs font-medium text-[#6B7280] mb-1.5 tracking-tight">{title}</p>

      {/* 값 */}
      {loading ? (
        <div className="h-9 w-32 bg-gray-100 rounded-lg animate-pulse" />
      ) : (
        <p className="leading-none">
          {prefix && (
            <span className="text-xl font-bold text-[#6B7280] mr-0.5">{prefix}</span>
          )}
          <span className="text-[2rem] font-bold text-[#111827] num">{number}</span>
          {suffix && (
            <span className="text-base font-semibold text-[#6B7280] ml-0.5">{suffix}</span>
          )}
        </p>
      )}

      {/* 변화율 보조 텍스트 */}
      {change !== null && !loading && (
        <p className="text-xs text-[#6B7280] mt-2">
          전월 대비{' '}
          <span className={`font-semibold ${change >= 0 ? 'text-red-500' : 'text-blue-500'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </p>
      )}
      {change === null && !loading && (
        <p className="text-xs text-[#6B7280] mt-2">전월 데이터 없음</p>
      )}
    </div>
  );
}
