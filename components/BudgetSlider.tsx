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
        <label className="text-sm font-medium text-gray-700">월 예산 (Budget)</label>
        <span className="text-sm font-bold text-indigo-600">₩{value.toLocaleString()}</span>
      </div>

      {/* Gauge display */}
      <div className="relative flex items-center justify-center h-24">
        <svg viewBox="0 0 200 110" className="w-48 h-24">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#6366f1"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.3} 251.3`}
          />
          <text x="100" y="90" textAnchor="middle" className="text-xs" fontSize="13" fontWeight="bold" fill="#111827">
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
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
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
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
