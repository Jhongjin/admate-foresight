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
        <label className="text-sm font-medium text-gray-700">캠페인 기간</label>
        <span className="text-sm font-bold text-indigo-600">{currentLabel}</span>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        {/* 숫자 입력 */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500 bg-white">
          <input
            type="number"
            value={inputVal}
            min={7}
            max={360}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            className="w-14 text-sm text-gray-800 font-medium text-center focus:outline-none"
          />
          <span className="text-sm text-gray-400">일</span>
        </div>

        {/* 구분선 */}
        <div className="h-8 w-px bg-gray-200" />

        {/* 퀵 프리셋 칩 */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(({ label, days: d }) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                days === d
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
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
