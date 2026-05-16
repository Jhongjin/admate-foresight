'use client';

type StatePanelVariant = 'loading' | 'empty' | 'error';
type StatePanelTone = 'neutral' | 'ready' | 'watch' | 'risk';

interface StatePanelLedgerItem {
  label: string;
  value: string;
  detail?: string;
  tone?: StatePanelTone;
}

interface StatePanelProps {
  variant: StatePanelVariant;
  title: string;
  description?: string;
  className?: string;
  eyebrow?: string;
  checks?: string[];
  ledger?: StatePanelLedgerItem[];
  nextActions?: string[];
}

export default function StatePanel({
  variant,
  title,
  description,
  className = '',
  eyebrow,
  checks,
  ledger = [],
  nextActions = [],
}: StatePanelProps) {
  const isLoading = variant === 'loading';
  const isError = variant === 'error';
  const isRich = ledger.length > 0 || nextActions.length > 0;
  const stateEyebrow = eyebrow ?? (isError ? '운영 확인 필요' : isLoading ? '분석 준비 중' : '기준선 대기');
  const displayChecks = checks ?? (isError
    ? ['연결 확인', '화면 보호', '재시도']
    : isLoading
      ? ['입력 확인', '집계 대기', '기준선 구성']
      : ['입력 범위', '벤치마크', '판독 보류']);
  const ledgerTone = (tone: StatePanelTone = 'neutral') => ({
    neutral: 'border-stone-200 bg-[#fbfaf7] text-slate-700',
    ready: 'border-teal-200 bg-teal-50 text-teal-900',
    watch: 'border-amber-200 bg-amber-50 text-amber-900',
    risk: 'border-red-200 bg-red-50 text-red-700',
  })[tone];

  return (
    <div
      role={isError ? 'alert' : isLoading ? 'status' : 'region'}
      aria-live={isError ? 'assertive' : isLoading ? 'polite' : undefined}
      aria-label={title}
      className={`relative flex min-h-48 items-center justify-center overflow-hidden rounded-md border border-dashed px-4 py-6 sm:px-6 sm:py-8 ${
        isError ? 'border-red-200 bg-red-50/70' : 'border-stone-300 bg-[#fbfaf6]'
      } ${className}`}
    >
      {!isError ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(120,113,108,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.12) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      ) : null}
      <div
        className={`relative grid w-full gap-4 ${
          isRich
            ? 'max-w-4xl text-left lg:grid-cols-[minmax(0,1fr)_minmax(240px,320px)] lg:items-stretch'
            : 'max-w-sm justify-items-center text-center'
        }`}
      >
        <div className={`flex min-w-0 ${isRich ? 'items-start gap-3 sm:gap-4' : 'flex-col items-center gap-3'}`}>
          {isLoading ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-teal-100 bg-white text-teal-700">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-100 border-t-teal-700" />
            </div>
          ) : isError ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-red-100 bg-white text-red-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 4.5h3.4L21 18H3L10.3 4.5Z" />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-500">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </div>
          )}
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isError ? 'text-red-500' : 'text-stone-500'}`}>
                {stateEyebrow}
              </p>
              <p className={`break-words text-sm font-semibold ${isError ? 'text-red-700' : 'text-slate-800'}`}>{title}</p>
              {description && (
                <p className={`break-words text-xs leading-relaxed ${isError ? 'text-red-500' : 'text-slate-500'}`}>{description}</p>
              )}
            </div>
            <div className={`flex w-full flex-wrap gap-1.5 border-t pt-3 ${isRich ? 'justify-start' : 'justify-center'} ${isError ? 'border-red-100' : 'border-stone-200'}`}>
              {displayChecks.map((item) => (
                <span
                  key={item}
                  className={`rounded-md border bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    isError ? 'border-red-100 text-red-500' : 'border-stone-200 text-stone-500'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        {isRich && (
          <div className={`min-w-0 rounded-md border p-3 ${isError ? 'border-red-100 bg-white/80' : 'border-stone-300 bg-white/75'}`}>
            {ledger.length > 0 && (
              <div>
                <div className={`flex items-center justify-between gap-3 border-b pb-2 ${isError ? 'border-red-100' : 'border-stone-200'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${isError ? 'text-red-500' : 'text-stone-500'}`}>판독 장부</p>
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${isError ? 'border-red-100 bg-red-50 text-red-600' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                    {isError ? '확인 필요' : '기준선 대기'}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {ledger.map((item) => (
                    <div key={`${item.label}-${item.value}`} className={`min-w-0 rounded-md border px-3 py-2 ${ledgerTone(item.tone)}`}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] opacity-70">{item.label}</p>
                      <p className="mt-1 break-words text-xs font-bold text-slate-950">{item.value}</p>
                      {item.detail && <p className="mt-0.5 text-[11px] leading-snug opacity-75">{item.detail}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {nextActions.length > 0 && (
              <div className={ledger.length > 0 ? 'mt-3 border-t border-stone-200 pt-3' : ''}>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${isError ? 'text-red-500' : 'text-stone-500'}`}>다음 액션</p>
                <ul className="mt-2 space-y-1.5">
                  {nextActions.map((item) => (
                    <li key={item} className="grid grid-cols-[0.5rem_minmax(0,1fr)] gap-2 text-[11px] leading-5 text-slate-600">
                      <span className={`mt-2 h-1.5 w-1.5 rounded-full ${isError ? 'bg-red-300' : 'bg-teal-500'}`} aria-hidden="true" />
                      <span className="break-words">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
