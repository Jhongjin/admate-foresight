'use client';

import { useState, useEffect } from 'react';

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

const PRESETS = [
  { label: '1주',   days: 7   },
  { label: '1개월', days: 30  },
  { label: '3개월', days: 90  },
  { label: '6개월', days: 180 },
  { label: '12개월',days: 360 },
];

interface DurationSliderProps {
  days: number;
  onChange: (days: number) => void;
}

function snapToStep(value: number): number {
  return STEPS.reduce((prev, curr) =>
    Math.abs(curr.days - value) < Math.abs(prev.days - value) ? curr : prev
  ).days;
}

export default function DurationSlider({ days, onChange }: DurationSliderProps) {
  const [inputVal, setInputVal] = useState(String(days));

  useEffect(() => {
    setInputVal(String(days));
  }, [days]);

  const currentLabel = STEPS.find(s => s.days === days)?.label ?? `${days}일`;

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputVal(e.target.value);
  }

  function handleInputBlur() {
    const v = parseInt(inputVal, 10);
    if (!isNaN(v) && v > 0) {
      const snapped = snapToStep(Math.min(360, Math.max(7, v)));
      onChange(snapped);
    } else {
      setInputVal(String(days));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">캠페인 기간</label>
        <span className="rounded-full border border-teal-800/10 bg-teal-50 px-3 py-1 text-sm font-black text-teal-900">{currentLabel}</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* 숫자 입력 */}
        <div className="foresight-control flex items-center gap-1.5 rounded-xl px-3 py-2">
          <input
            type="number"
            value={inputVal}
            min={7}
            max={360}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="num w-14 bg-transparent text-center text-sm font-bold text-slate-800 focus:outline-none"
          />
          <span className="text-sm font-medium text-stone-500">일</span>
        </div>

        {/* 구분선 */}
        <div className="h-8 w-px bg-stone-300" />

        {/* 퀵 프리셋 칩 */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(({ label, days: d }) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
                days === d
                  ? 'border-teal-900 bg-teal-900 text-white'
                  : 'border-stone-200 bg-white/80 text-slate-600 hover:border-teal-700/30 hover:text-teal-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
