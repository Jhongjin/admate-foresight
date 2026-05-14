'use client';

type StatePanelVariant = 'loading' | 'empty' | 'error';

interface StatePanelProps {
  variant: StatePanelVariant;
  title: string;
  description?: string;
  className?: string;
  eyebrow?: string;
}

export default function StatePanel({
  variant,
  title,
  description,
  className = '',
  eyebrow,
}: StatePanelProps) {
  const isLoading = variant === 'loading';
  const isError = variant === 'error';
  const stateEyebrow = eyebrow ?? (isError ? 'Review Required' : isLoading ? 'Forecast Workbench' : 'Planning State');

  return (
    <div
      role={isError ? 'alert' : isLoading ? 'status' : 'region'}
      aria-live={isError ? 'assertive' : isLoading ? 'polite' : undefined}
      aria-label={title}
      className={`relative flex min-h-48 items-center justify-center overflow-hidden rounded-md border border-dashed px-6 py-8 text-center ${
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
      <div className="relative flex max-w-sm flex-col items-center gap-3">
        {isLoading ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-teal-100 bg-white text-teal-700">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-teal-100 border-t-teal-700" />
          </div>
        ) : isError ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white border border-red-100 text-red-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 4.5h3.4L21 18H3L10.3 4.5Z" />
            </svg>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white border border-stone-200 text-stone-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
        )}
        <div className="space-y-1">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isError ? 'text-red-500' : 'text-stone-500'}`}>
            {stateEyebrow}
          </p>
          <p className={`text-sm font-semibold ${isError ? 'text-red-700' : 'text-slate-800'}`}>{title}</p>
          {description && (
            <p className={`text-xs leading-relaxed ${isError ? 'text-red-500' : 'text-slate-500'}`}>{description}</p>
          )}
        </div>
        {!isError && (
          <div className="mt-1 flex w-full flex-wrap justify-center gap-1.5 border-t border-stone-200 pt-3">
            {['Input', 'Benchmark', 'Range'].map((item) => (
              <span key={item} className="rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
