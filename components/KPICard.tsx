'use client';

interface KPICardProps {
  title: string;
  value: string;
  change: number | null;
  icon: string;
  loading?: boolean;
}

export default function KPICard({ title, value, change, icon, loading }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <span className="text-2xl">{icon}</span>
        {change !== null && !loading && (
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${
              change >= 0
                ? 'bg-red-50 text-red-600'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      {loading ? (
        <div className="h-9 w-32 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      )}
      {change !== null && !loading && (
        <p className="text-xs text-gray-400 mt-2">
          전월 대비{' '}
          <span className={change >= 0 ? 'text-red-500' : 'text-blue-500'}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </p>
      )}
      {change === null && !loading && (
        <p className="text-xs text-gray-400 mt-2">전월 데이터 없음</p>
      )}
    </div>
  );
}
