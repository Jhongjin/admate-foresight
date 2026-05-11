'use client';

type StatePanelVariant = 'loading' | 'empty';

interface StatePanelProps {
  variant: StatePanelVariant;
  title: string;
  description?: string;
  className?: string;
}

export default function StatePanel({
  variant,
  title,
  description,
  className = '',
}: StatePanelProps) {
  const isLoading = variant === 'loading';

  return (
    <div
      role={isLoading ? 'status' : 'region'}
      aria-live={isLoading ? 'polite' : undefined}
      aria-label={title}
      className={`flex min-h-48 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-6 py-8 text-center ${className}`}
    >
      <div className="flex max-w-sm flex-col items-center gap-3">
        {isLoading ? (
          <div className="h-8 w-8 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h10" />
            </svg>
          </div>
        )}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-700">{title}</p>
          {description && (
            <p className="text-xs leading-relaxed text-gray-400">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
