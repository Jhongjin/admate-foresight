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
      {label && <label className="text-sm font-medium text-stone-700">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:border-teal-200 hover:bg-[#fbfaf7] focus:outline-none focus:ring-2 focus:ring-teal-200"
        >
          <span className={selected.length === 0 ? 'text-stone-500' : 'text-stone-800'}>
            {displayText}
          </span>
          <svg
            className={`h-4 w-4 text-teal-700 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 shadow-sm ring-1 ring-teal-100">
            {/* 전체 선택 */}
            <label className="flex cursor-pointer items-center gap-2 border-b border-stone-100 px-3 py-2 hover:bg-amber-50">
              <input
                type="checkbox"
                checked={selected.length === options.length}
                onChange={toggleAll}
                className="h-3.5 w-3.5 accent-teal-700"
              />
              <span className="text-sm font-medium text-stone-700">전체 선택</span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-teal-50">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="h-3.5 w-3.5 accent-teal-700"
                />
                <span className="text-sm text-stone-700">{opt}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && selected.length < options.length && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-700">
              {s}
              <button type="button" onClick={() => toggle(s)} className="text-stone-400 hover:text-teal-800">&times;</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
