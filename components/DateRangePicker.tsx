'use client';

import { useState, useEffect } from 'react';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date) => void;
}

const PRESETS = [
  { label: '1주',   days: 7   },
  { label: '1개월', days: 30  },
  { label: '3개월', days: 90  },
  { label: '6개월', days: 180 },
];

function toInputStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

function parseLocal(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function calcCampaignDays(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function hasPeakMonth(start: Date, end: Date): boolean {
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    const m = cur.getMonth() + 1;
    if (m === 11 || m === 12) return true;
    cur.setMonth(cur.getMonth() + 1);
  }
  return false;
}

export default function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [startStr, setStartStr] = useState(toInputStr(startDate));
  const [endStr, setEndStr] = useState(toInputStr(endDate));

  useEffect(() => { setStartStr(toInputStr(startDate)); }, [startDate]);
  useEffect(() => { setEndStr(toInputStr(endDate)); }, [endDate]);

  const days = calcCampaignDays(startDate, endDate);
  const isPeak = hasPeakMonth(startDate, endDate);

  function handleStartChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setStartStr(val);
    if (!val) return;
    const newStart = parseLocal(val);
    const newEnd = newStart > endDate
      ? new Date(newStart.getFullYear(), newStart.getMonth(), newStart.getDate() + 6)
      : endDate;
    onChange(newStart, newEnd);
  }

  function handleEndChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEndStr(val);
    if (!val) return;
    const newEnd = parseLocal(val);
    if (newEnd >= startDate) onChange(startDate, newEnd);
  }

  function applyPreset(days: number) {
    const newEnd = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      startDate.getDate() + days - 1,
    );
    onChange(startDate, newEnd);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700">캠페인 기간</label>
        <span className="num rounded-full border border-teal-800/10 bg-teal-50 px-3 py-1 text-sm font-black text-teal-900">총 {days}일</span>
      </div>

      {/* 날짜 입력 */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={startStr}
          onChange={handleStartChange}
          className="foresight-control rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
        />
        <span className="text-xs font-bold text-stone-400">~</span>
        <input
          type="date"
          value={endStr}
          min={startStr}
          onChange={handleEndChange}
          className="foresight-control rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none"
        />
      </div>

      {/* 퀵 프리셋 */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(({ label, days: d }) => (
          <button
            key={d}
            type="button"
            onClick={() => applyPreset(d)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] ${
              days === d
                ? 'border-teal-900 bg-teal-900 text-white'
                : 'border-stone-200 bg-white/80 text-slate-600 hover:border-teal-700/30 hover:text-teal-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 성수기 경고 */}
      {isPeak && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-800">
          11~12월 성수기 포함 - CPM 할증(+15%)이 자동 반영됩니다
        </div>
      )}
    </div>
  );
}
