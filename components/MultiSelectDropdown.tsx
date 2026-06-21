'use client';

import { useState, useRef, useEffect, useId } from 'react';

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
  const listboxId = useId();
  const hasOptions = options.length > 0;

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
    if (!hasOptions) return;
    onChange(selected.length === options.length ? [] : [...options]);
  }

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === options.length
    ? '전체'
    : selected.length <= 2
    ? selected.join(', ')
    : `${selected.slice(0, 2).join(', ')} 외 ${selected.length - 2}`;
  const selectedPreview = selected.slice(0, 3);
  const remainingSelectedCount = Math.max(0, selected.length - selectedPreview.length);

  return (
    <div className="space-y-1" ref={ref}>
      {label && <label className="text-sm font-medium text-stone-700">{label}</label>}
      <div className="relative">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false);
          }}
          className="flex w-full items-center justify-between gap-3 rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-sm text-stone-700 transition-colors hover:border-teal-300 hover:bg-[#fbfaf7] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
        >
          <span className={`min-w-0 truncate ${selected.length === 0 ? 'text-stone-500' : 'font-semibold text-stone-800'}`}>
            {displayText}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {selected.length > 0 && selected.length < options.length && (
              <span className="rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800">
                {selected.length}
              </span>
            )}
            <svg
              className={`h-4 w-4 text-teal-700 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </button>

        {open && (
          <div
            id={listboxId}
            className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-stone-200 bg-white py-1 shadow-sm ring-1 ring-teal-100"
          >
            <label className={`flex items-center gap-2 border-b border-stone-100 px-3 py-2 ${hasOptions ? 'cursor-pointer hover:bg-amber-50' : 'cursor-not-allowed opacity-60'}`}>
              <input
                type="checkbox"
                checked={hasOptions && selected.length === options.length}
                onChange={toggleAll}
                disabled={!hasOptions}
                className="h-3.5 w-3.5 accent-teal-700"
              />
              <span className="min-w-0 text-sm font-medium text-stone-700">
                {hasOptions ? '전체 선택' : '선택지 대기'}
              </span>
            </label>
            {options.map((opt) => (
              <label key={opt} className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-teal-50">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="h-3.5 w-3.5 accent-teal-700"
                />
                <span className="min-w-0 break-words text-sm text-stone-700">{opt}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {selected.length > 0 && selected.length < options.length && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedPreview.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-700">
              {s}
              <button
                type="button"
                onClick={() => toggle(s)}
                className="text-stone-400 hover:text-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-200"
                aria-label={`${s} 선택 해제`}
              >
                &times;
              </button>
            </span>
          ))}
          {remainingSelectedCount > 0 && (
            <span className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-800">
              +{remainingSelectedCount}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
