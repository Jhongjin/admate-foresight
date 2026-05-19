'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface NavigationProps {
  isAuthenticated?: boolean;
}

const navItems = [
  { href: '/', label: '성과 예측' },
  { href: '/trends', label: '기준선' },
  { href: '/insights', label: '시즌성' },
  { href: '/competitor', label: '시장 감시' },
];

const siteItems = [
  {
    href: 'https://home.admate.ai.kr',
    label: 'AdMate Home',
    description: '제품군 안내와 공지',
    active: false,
  },
  {
    href: 'https://home.admate.ai.kr/access-request?product=foresight',
    label: '이용 권한 요청',
    description: '필요한 제품 권한 신청',
    active: false,
  },
  {
    href: 'https://compass.admate.ai.kr',
    label: 'Compass',
    description: '광고 정책 근거 확인',
    active: false,
  },
  {
    href: 'https://sentinel.admate.ai.kr',
    label: 'Sentinel',
    description: '실시간 관제와 사전 검수',
    active: false,
  },
  {
    href: 'https://lens.admate.ai.kr',
    label: 'Lens',
    description: '캡처 검수와 작업 기록',
    active: false,
  },
  {
    href: 'https://foresight.admate.ai.kr',
    label: 'Foresight',
    description: '성과 예측과 기준선 관리',
    active: true,
  },
];

export default function Navigation({ isAuthenticated = false }: NavigationProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [siteOpen, setSiteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const siteRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const isAuthRoute = pathname === '/login' || pathname === '/reset-password';
  const showSignedIn = isAuthenticated && !isAuthRoute;

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (siteRef.current && !siteRef.current.contains(target)) setSiteOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  function getLinkClass(href: string, variant: 'desktop' | 'mobile') {
    const isActive = href === '/' ? pathname === href : pathname.startsWith(href);
    const base =
      'rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2';
    const active = isActive
      ? 'bg-teal-50 text-teal-800 ring-1 ring-teal-100'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950';

    return variant === 'desktop'
      ? `${base} ${active} px-3 py-2`
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

  return (
    <nav aria-label="주요 탐색" className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="AdMate Foresight 홈"
            className="flex min-w-0 shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
          >
            <span
              aria-hidden="true"
              className="h-9 w-9 rounded-md bg-cover bg-center"
              style={{ backgroundImage: "url('/brand/admate-foresight-mark.svg')" }}
            />
            <div className="min-w-0">
              <span className="block truncate text-lg font-bold leading-5 text-slate-950">AdMate Foresight</span>
              <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">예측 기준 관리</span>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center gap-1 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={getLinkClass(item.href, 'desktop')}>
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative" ref={siteRef}>
              <button
                type="button"
                onClick={() => setSiteOpen((current) => !current)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded bg-amber-100 text-[10px] font-black text-amber-700">A</span>
                <span className="hidden sm:inline">사이트 이동</span>
                <span aria-hidden="true" className="text-xs text-slate-400">v</span>
              </button>
              {siteOpen ? (
                <div className="absolute right-0 mt-2 w-72 rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">AdMate Suite</p>
                  <div className="my-1 h-px bg-slate-100" />
                  {siteItems.map((site) => (
                    <Link
                      key={site.label}
                      href={site.href}
                      className="flex rounded-md px-3 py-2.5 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {site.label}
                          {site.active ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">현재</span> : null}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{site.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>

            {showSignedIn ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-teal-700 text-xs font-black text-white">A</span>
                  <span className="hidden sm:inline">AdMate 계정</span>
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-64 rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                    <div className="px-3 py-2">
                      <p className="text-sm font-bold">AdMate 계정</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">로그인됨</p>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <Link href="/account" className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-teal-50">
                      마이페이지
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="mt-1 block w-full rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isLoggingOut ? '로그아웃 중' : '로그아웃'}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center rounded-md bg-teal-700 px-3 text-sm font-bold text-white transition-colors hover:bg-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                로그인
              </Link>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-controls="foresight-mobile-navigation"
              aria-expanded={isMobileMenuOpen}
              aria-label={isMobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 lg:hidden"
            >
              {isMobileMenuOpen ? '닫기' : '메뉴'}
            </button>
          </div>
        </div>

        <div
          id="foresight-mobile-navigation"
          className={`border-t border-slate-100 pb-3 lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
        >
          <div className="grid gap-1 py-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={getLinkClass(item.href, 'mobile')}
              >
                {item.label}
              </Link>
            ))}
            {showSignedIn ? (
              <Link href="/account" onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass('/account', 'mobile')}>
                마이페이지
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
