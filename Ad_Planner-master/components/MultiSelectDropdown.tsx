'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectDropdown({ label, options, selected, onChange, placeholder = '전체' }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  function toggleAll() {
    onChange(selected.length === options.length ? [] : [...options]);
  }

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === options.length
    ? '전체'
    : selected.join(', ');

  return (
    <div className="space-y-1" ref={ref}>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-left text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between"
        >
          <span className={selected.length === 0 ? 'text-gray-500' : 'text-gray-800'}>
            {displayText}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto">
            {/* 전체 선택 */}
            <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
              <input
                type="checkbox"
                checked={selected.length === options.length}
                onChange={toggleAll}
                className="accent-indigo-600 w-3.5 h-3.5"
              />
              <span className="text-sm font-medium text-gray-700">전체 선택</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="accent-indigo-600 w-3.5 h-3.5"
                />
                <span className="text-sm text-gray-700">{opt}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && selected.length < options.length && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full">
              {s}
              <button onClick={() => toggle(s)} className="hover:text-indigo-900">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
