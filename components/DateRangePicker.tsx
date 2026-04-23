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
        <label className="text-sm font-medium text-gray-700">캠페인 기간</label>
        <span className="text-sm font-bold text-indigo-600">총 {days}일</span>
      </div>

      {/* 날짜 입력 */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="date"
          value={startStr}
          onChange={handleStartChange}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        <span className="text-xs text-gray-400">~</span>
        <input
          type="date"
          value={endStr}
          min={startStr}
          onChange={handleEndChange}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* 퀵 프리셋 */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map(({ label, days: d }) => (
          <button
            key={d}
            type="button"
            onClick={() => applyPreset(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              days === d
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 성수기 경고 */}
      {isPeak && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <span>⚠️</span>
          <span>11~12월 성수기 포함 — CPM 할증(+15%)이 자동 반영됩니다</span>
        </div>
      )}
    </div>
  );
}
