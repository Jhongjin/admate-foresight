'use client';

export const STEPS = [
  { label: '1주',   days: 7   },
  { label: '2주',   days: 14  },
  { label: '3주',   days: 21  },
  { label: '4주',   days: 28  },
  { label: '1개월', days: 30  },
  { label: '2개월', days: 60  },
  { label: '3개월', days: 90  },
  { label: '4개월', days: 120 },
  { label: '5개월', days: 150 },
  { label: '6개월', days: 180 },
  { label: '7개월', days: 210 },
  { label: '8개월', days: 240 },
  { label: '9개월', days: 270 },
  { label: '10개월',days: 300 },
  { label: '11개월',days: 330 },
  { label: '12개월',days: 360 },
];

// 슬라이더에 표시할 tick 레이블 (일부만)
const TICK_LABELS = ['1주', '1개월', '3개월', '6개월', '12개월'];
const TICK_INDICES = STEPS.reduce<number[]>((acc, s, i) => {
  if (TICK_LABELS.includes(s.label)) acc.push(i);
  return acc;
}, []);

interface DurationSliderProps {
  days: number;
  onChange: (days: number) => void;
}

export default function DurationSlider({ days, onChange }: DurationSliderProps) {
  const currentIndex = STEPS.findIndex(s => s.days === days);
  const safeIndex = currentIndex === -1 ? 4 : currentIndex; // 기본 1개월
  const currentStep = STEPS[safeIndex];
  const pct = (safeIndex / (STEPS.length - 1)) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">캠페인 기간</label>
        <span className="text-sm font-bold text-indigo-600">{currentStep.label}</span>
      </div>

      {/* Gauge */}
      <div className="relative flex items-center justify-center h-24">
        <svg viewBox="0 0 200 110" className="w-48 h-24">
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#6366f1" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 251.3} 251.3`} />
          <text x="100" y="90" textAnchor="middle" fontSize="15" fontWeight="bold" fill="#111827">
            {currentStep.label}
          </text>
        </svg>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={STEPS.length - 1}
        step={1}
        value={safeIndex}
        onChange={(e) => onChange(STEPS[Number(e.target.value)].days)}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
      />

      {/* Tick labels */}
      <div className="relative h-4">
        {TICK_INDICES.map((idx) => (
          <span
            key={idx}
            className="absolute text-xs text-gray-400 -translate-x-1/2"
            style={{ left: `${(idx / (STEPS.length - 1)) * 100}%` }}
          >
            {STEPS[idx].label}
          </span>
        ))}
      </div>
    </div>
  );
}
