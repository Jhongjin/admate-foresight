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

  return (
    <div
      role={isError ? 'alert' : isLoading ? 'status' : 'region'}
      aria-live={isError ? 'assertive' : isLoading ? 'polite' : undefined}
      aria-label={title}
      className={`relative flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed px-6 py-8 text-center ${
        isError ? 'border-red-200 bg-red-50/70' : 'border-slate-200 bg-slate-50/80'
      } ${className}`}
    >
      {!isError && !isLoading ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      ) : null}
      <div className="relative flex max-w-sm flex-col items-center gap-3">
        {isLoading ? (
          <div className="h-8 w-8 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
        ) : isError ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-red-100 text-red-500">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v4m0 4h.01M10.3 4.5h3.4L21 18H3L10.3 4.5Z" />
            </svg>
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
        )}
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
          )}
          <p className={`text-sm font-semibold ${isError ? 'text-red-700' : 'text-slate-800'}`}>{title}</p>
          {description && (
            <p className={`text-xs leading-relaxed ${isError ? 'text-red-500' : 'text-slate-500'}`}>{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
