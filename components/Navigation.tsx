'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '성과 예측 시뮬레이터' },
  { href: '/trends', label: '업종별 트렌드' },
  { href: '/insights', label: '시즌 인사이트' },
  { href: '/competitor', label: '경쟁사 모니터링' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const showLogout = pathname !== '/login' && pathname !== '/reset-password';

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      });
    } finally {
      window.location.assign('/login');
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 sm:flex-nowrap sm:py-0">
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-white text-xs font-bold">AP</span>
            </div>
            <span className="text-lg font-bold text-gray-900">Ad-Planner AI</span>
          </div>
          <div className="flex max-w-full items-center gap-2 overflow-x-auto">
            <div className="flex shrink-0 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {showLogout ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoggingOut ? '로그아웃 중' : '로그아웃'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
