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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAuthRoute = pathname === '/login' || pathname === '/reset-password';
  const showLogout = !isAuthRoute;

  function getLinkClass(href: string, variant: 'desktop' | 'mobile') {
    const isActive = href === '/' ? pathname === href : pathname.startsWith(href);
    const base =
      'rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';
    const active = isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900';

    return variant === 'desktop'
      ? `${base} ${active} px-4 py-2`
      : `${base} ${active} block px-3 py-2`;
  }

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        cache: 'no-store',
      });
    } finally {
      window.location.assign('/login?logout=complete');
    }
  }

  if (isAuthRoute) {
    return (
      <nav aria-label="제품 정보" className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center py-3">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <span className="text-white text-xs font-bold">AF</span>
              </div>
              <span className="text-lg font-bold text-gray-900">AdMate Foresight</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="주요 탐색" className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-3 md:py-0">
          <Link
            href="/"
            aria-label="AdMate Foresight 홈"
            className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-white text-xs font-bold">AF</span>
            </div>
            <span className="text-lg font-bold text-gray-900">AdMate Foresight</span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex shrink-0 gap-1">
              {navItems.map((item) => {
                const isActive = item.href === '/'
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={getLinkClass(item.href, 'desktop')}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            {showLogout ? (
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {isLoggingOut ? '로그아웃 중' : '로그아웃'}
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-controls="foresight-mobile-navigation"
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 md:hidden"
          >
            {isMobileMenuOpen ? '닫기' : '메뉴'}
          </button>
        </div>
        <div
          id="foresight-mobile-navigation"
          className={`border-t border-gray-100 pb-3 md:hidden ${
            isMobileMenuOpen ? 'block' : 'hidden'
          }`}
        >
          <div className="grid gap-1 py-3">
            {navItems.map((item) => {
              const isActive = item.href === '/'
                ? pathname === item.href
                : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={getLinkClass(item.href, 'mobile')}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          {showLogout ? (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoggingOut ? '로그아웃 중' : '로그아웃'}
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
