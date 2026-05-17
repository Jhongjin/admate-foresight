'use client';

interface PlanningStatePanelSignal {
  label: string;
  value: string;
  detail: string;
}

interface PlanningStatePanelStage {
  label: string;
  status: string;
}

interface PlanningStatePanelProps {
  eyebrow: string;
  title: string;
  description: string;
  signals: PlanningStatePanelSignal[];
  stages?: PlanningStatePanelStage[];
  className?: string;
}

export default function PlanningStatePanel({
  eyebrow,
  title,
  description,
  signals,
  stages,
  className = '',
}: PlanningStatePanelProps) {
  return (
    <section
      aria-label={title}
      className={`relative overflow-hidden rounded-md border border-dashed border-stone-300 bg-[#fbfaf6] ${className}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(120,113,108,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,113,108,0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative border-b border-stone-200 bg-white/80 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500">{eyebrow}</p>
        <h2 className="mt-1 text-sm font-bold text-slate-950">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="relative grid gap-0 sm:grid-cols-3">
        {signals.map((signal) => (
          <div key={signal.label} className="border-t border-stone-200 bg-white/45 px-4 py-3 sm:border-r sm:border-t-0 last:border-r-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{signal.label}</p>
            <p className="mt-1 text-sm font-bold text-slate-950">{signal.value}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{signal.detail}</p>
          </div>
        ))}
      </div>
      {stages && stages.length > 0 && (
        <div className="relative border-t border-stone-200 bg-stone-50/85 px-4 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            {stages.map((stage, index) => (
              <div key={stage.label} className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 py-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-stone-500">{stage.label}</p>
                  <p className="truncate text-xs font-bold text-slate-950">{stage.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
