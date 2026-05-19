'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', label: '성과 예측' },
  { href: '/trends', label: '기준선' },
  { href: '/insights', label: '시즌성' },
  { href: '/competitor', label: '시장 감시' },
  { href: '/account', label: '계정' },
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
      'rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
    const active = isActive
      ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-100'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950';

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
      <nav aria-label="제품 정보" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center py-3">
            <div className="flex shrink-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-8 w-8 rounded-md bg-cover bg-center"
                style={{ backgroundImage: "url('/brand/admate-foresight-mark.svg')" }}
              />
              <span className="text-lg font-bold text-slate-950">AdMate Foresight</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="주요 탐색" className="bg-white/95 border-b border-slate-200 sticky top-0 z-50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-3 md:py-0">
          <Link
            href="/"
            aria-label="AdMate Foresight 홈"
            className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className="h-9 w-9 rounded-md bg-cover bg-center"
              style={{ backgroundImage: "url('/brand/admate-foresight-mark.svg')" }}
            />
            <div>
              <span className="block text-lg font-bold leading-5 text-slate-950">AdMate Foresight</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">예측 기준 관리</span>
            </div>
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
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
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
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 md:hidden"
          >
            {isMobileMenuOpen ? '닫기' : '메뉴'}
          </button>
        </div>
        <div
          id="foresight-mobile-navigation"
          className={`border-t border-slate-100 pb-3 md:hidden ${
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
              className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
            >
              {isLoggingOut ? '로그아웃 중' : '로그아웃'}
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
