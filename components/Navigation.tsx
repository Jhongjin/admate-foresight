'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface NavigationProps {
  isAuthenticated?: boolean;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="m5.8 7.5 4.2 4.2 4.2-4.2"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

const siteItems = [
  {
    href: 'https://home.admate.ai.kr',
    label: 'AdMate Home',
    description: '제품군 안내와 공지',
    icon: 'H',
    active: false,
  },
  {
    href: 'https://home.admate.ai.kr/access-request?product=foresight',
    label: '이용 권한 요청',
    description: '필요한 제품 권한 신청',
    icon: '+',
    active: false,
  },
  {
    href: 'https://compass.admate.ai.kr',
    label: 'Compass',
    description: '광고 정책 근거 확인',
    icon: 'C',
    active: false,
  },
  {
    href: 'https://sentinel.admate.ai.kr',
    label: 'Sentinel',
    description: '실시간 관제와 사전 검수',
    icon: 'S',
    active: false,
  },
  {
    href: 'https://lens.admate.ai.kr',
    label: 'Lens',
    description: '캡처 검수와 작업 기록',
    icon: 'L',
    active: false,
  },
  {
    href: 'https://foresight.admate.ai.kr',
    label: 'Foresight',
    description: '성과 예측과 기준선 관리',
    icon: 'F',
    active: true,
  },
];

export default function Navigation({ isAuthenticated = false }: NavigationProps) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

          <div className="hidden min-w-0 flex-1 lg:block" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative" ref={siteRef}>
              <button
                type="button"
                aria-label="사이트 이동"
                aria-haspopup="menu"
                aria-expanded={siteOpen}
                onClick={() => setSiteOpen((current) => !current)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-teal-200 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2"
              >
                <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded bg-amber-100 text-[10px] font-black text-amber-700">A</span>
                <span className="hidden sm:inline">사이트 이동</span>
                <ChevronIcon open={siteOpen} />
              </button>
              {siteOpen ? (
                <div className="absolute right-0 mt-2 w-72 overflow-hidden rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                  <p className="px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">AdMate Suite</p>
                  <div className="my-1 h-px bg-slate-100" />
                  {siteItems.map((site) => (
                    <Link
                      key={site.label}
                      href={site.href}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-xs font-black text-teal-700">
                        {site.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {site.label}
                          {site.active ? <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">현재</span> : null}
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
                  <ChevronIcon open={profileOpen} />
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

          </div>
        </div>
      </div>
    </nav>
  );
}
