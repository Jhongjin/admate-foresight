'use client';

interface BudgetSliderProps {
  value: number;
  onChange: (v: number) => void;
}

const MIN = 1_000_000;
const MAX = 100_000_000;

function formatKRW(v: number): string {
  if (v >= 100_000_000) return `${(v / 100_000_000).toFixed(0)}억`;
  if (v >= 10_000_000) return `${(v / 10_000_000).toFixed(1)}천만`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}백만`;
  return v.toLocaleString();
}

export default function BudgetSlider({ value, onChange }: BudgetSliderProps) {
  const pct = ((value - MIN) / (MAX - MIN)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">총 캠페인 예산</label>
        <span className="num rounded-full border border-teal-800/10 bg-teal-50 px-3 py-1 text-sm font-black text-teal-900">
          ₩{value.toLocaleString()}
        </span>
      </div>

      {/* Gauge display */}
      <div className="relative flex h-24 items-center justify-center rounded-2xl border border-stone-200/80 bg-[#fbfaf6]">
        <svg viewBox="0 0 200 110" className="w-48 h-24">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#d8d4ca"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#0f766e"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.3} 251.3`}
          />
          <text x="100" y="90" textAnchor="middle" className="text-xs" fontSize="13" fontWeight="800" fill="#101820">
            {formatKRW(value)}
          </text>
        </svg>
      </div>

      <input
        type="range"
        min={MIN}
        max={MAX}
        step={500_000}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="foresight-range h-2 w-full cursor-pointer appearance-none rounded-lg bg-stone-200"
      />
      <div className="flex justify-between text-xs font-medium text-stone-500">
        <span>₩{formatKRW(MIN)}</span>
        <span>₩{formatKRW(MAX)}</span>
      </div>

      {/* Direct input */}
      <input
        type="number"
        value={value}
        min={MIN}
        max={MAX}
        step={500_000}
        onChange={(e) => {
          const v = Math.min(MAX, Math.max(MIN, Number(e.target.value)));
          onChange(v);
        }}
        className="foresight-control num w-full rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
      />
    </div>
  );
}
