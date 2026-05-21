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

function SparkleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-amber-500">
      <path
        d="M10 2.8 11.6 7l4.2 1.6-4.2 1.6L10 14.4l-1.6-4.2-4.2-1.6L8.4 7 10 2.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path
        d="m15.2 13.2.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8ZM4.6 12.1l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5.5-1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

type SiteIconName = 'home' | 'access' | 'compass' | 'sentinel' | 'lens' | 'foresight';

function SiteIcon({ name }: { name: SiteIconName }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: '1.8',
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-[#2764D9]">
      {name === 'home' ? (
        <>
          <path d="m4 10 8-6 8 6" {...common} />
          <path d="M6.5 9.5V20h11V9.5" {...common} />
          <path d="M10 20v-5h4v5" {...common} />
        </>
      ) : null}
      {name === 'access' ? (
        <>
          <path d="M12 3.5 19 7v5.2c0 4.2-2.8 6.8-7 8.3-4.2-1.5-7-4.1-7-8.3V7l7-3.5Z" {...common} />
          <path d="M12 8v7M8.5 11.5h7" {...common} />
        </>
      ) : null}
      {name === 'compass' ? (
        <>
          <circle cx="12" cy="12" r="8.5" {...common} />
          <path d="m14.9 8.1-1.8 5-4 2 1.8-5 4-2Z" {...common} />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" {...common} />
        </>
      ) : null}
      {name === 'sentinel' ? (
        <>
          <path d="M4.5 19.5h15M7 19.5 8.2 8.8a3.8 3.8 0 0 1 7.6 0L17 19.5" {...common} />
          <path d="M9 12h6M10 8.7h4M12 3.5v-2M5.2 6.3 3.8 4.9M18.8 6.3l1.4-1.4" {...common} />
        </>
      ) : null}
      {name === 'lens' ? (
        <>
          <rect x="4" y="6" width="16" height="12" rx="3" {...common} />
          <circle cx="12" cy="12" r="3.2" {...common} />
          <path d="M7.5 9.2h.1M16.8 17.4l2.2 2.2" {...common} />
        </>
      ) : null}
      {name === 'foresight' ? (
        <>
          <path d="M3.8 12s3-5.5 8.2-5.5 8.2 5.5 8.2 5.5-3 5.5-8.2 5.5S3.8 12 3.8 12Z" {...common} />
          <circle cx="12" cy="12" r="2.5" {...common} />
          <path d="M16.8 5.1 18.5 3.4M18 8.2h2.2M7.2 18.9l-1.7 1.7" {...common} />
        </>
      ) : null}
    </svg>
  );
}

const siteItems = [
  {
    href: 'https://home.admate.ai.kr',
    label: 'AdMate Home',
    description: '제품군 안내와 공지',
    icon: 'home',
    active: false,
  },
  {
    href: 'https://home.admate.ai.kr/access-request?product=foresight',
    label: '이용 권한 요청',
    description: '필요한 제품 이용 권한 요청',
    icon: 'access',
    active: false,
  },
  {
    href: 'https://compass.admate.ai.kr',
    label: 'Compass',
    description: '광고 정책 근거 확인',
    icon: 'compass',
    active: false,
  },
  {
    href: 'https://sentinel.admate.ai.kr',
    label: 'Sentinel',
    description: '상태 모니터링과 이상 알림',
    icon: 'sentinel',
    active: false,
  },
  {
    href: 'https://lens.admate.ai.kr',
    label: 'Lens',
    description: '광고 화면 확인과 기록',
    icon: 'lens',
    active: false,
  },
  {
    href: 'https://foresight.admate.ai.kr',
    label: 'Foresight',
    description: '성과 예측과 기준선 관리',
    icon: 'foresight',
    active: true,
  },
] satisfies Array<{
  href: string;
  label: string;
  description: string;
  icon: SiteIconName;
  active: boolean;
}>;

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
    <nav aria-label="주요 탐색" className="fixed left-0 right-0 top-0 z-50 border-b border-[#E2E8F0] bg-[rgba(255,255,255,0.95)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2 sm:gap-3">
          <Link
            href="/"
            aria-label="AdMate Foresight 홈"
            className="flex min-w-0 shrink items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:gap-3"
          >
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded-md bg-cover bg-center sm:h-9 sm:w-9"
              style={{ backgroundImage: "url('/brand/admate-foresight-mark.svg')" }}
            />
            <div className="min-w-0 max-[380px]:hidden">
              <span className="block truncate text-lg font-bold leading-5 text-slate-950">AdMate Foresight</span>
              <em className="hidden text-[10px] font-semibold not-italic uppercase leading-3 tracking-[0.16em] text-slate-500 sm:block">forecast baseline</em>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 lg:block" aria-hidden="true" />

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="relative" ref={siteRef}>
              <button
                type="button"
                aria-label="사이트 이동"
                aria-haspopup="menu"
                aria-expanded={siteOpen}
                onClick={() => setSiteOpen((current) => !current)}
                className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#D7DCE3] bg-white/90 px-2 text-sm font-semibold text-[#25314A] shadow-[0_10px_24px_rgba(16,24,32,0.08)] transition duration-300 hover:border-[#C4CEDA] hover:bg-[#F8F6F1] hover:text-[#172033] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172033] focus-visible:ring-offset-2 sm:h-10 sm:min-w-[124px] sm:gap-2 sm:px-3"
              >
                <SparkleIcon />
                <span className="hidden sm:inline">사이트 이동</span>
                <ChevronIcon open={siteOpen} />
              </button>
              {siteOpen ? (
                <div
                  role="menu"
                  aria-label="AdMate 사이트 이동"
                  className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[10px] border border-[#D7DCE3] bg-white p-2 text-[#172033] shadow-[0_20px_56px_rgba(16,24,32,0.16)] max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:top-14 max-sm:mt-0 max-sm:w-auto max-sm:max-w-none"
                >
                  <p className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#68707C]">ADMATE SUITE</p>
                  <div className="mb-1.5 h-px bg-[#D8DEE6]" />
                  {siteItems.map((site) => (
                    <Link
                      key={site.label}
                      href={site.href}
                      role="menuitem"
                      className="grid min-h-[58px] grid-cols-[40px_minmax(0,1fr)] items-center gap-2.5 rounded-[8px] px-2.5 py-2 transition-colors hover:bg-[#F4F7FB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172033]"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] border border-[#D7DCE3] bg-[#F8F6F1]">
                        <SiteIcon name={site.icon} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-[14px] font-bold leading-tight text-[#172033]">
                          {site.label}
                          {site.active ? <span className="rounded-[6px] bg-[#FFF3D8] px-1.5 py-0.5 text-[11px] font-bold text-[#7A5518]">현재</span> : null}
                        </span>
                        <span className="mt-0.5 block text-[12px] font-medium leading-[17px] text-[#68707C]">{site.description}</span>
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
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 sm:h-10"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-950 text-xs font-black text-white">A</span>
                  <span className="hidden sm:inline">AdMate 계정</span>
                  <ChevronIcon open={profileOpen} />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded-md border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                    <div className="px-3 py-2">
                      <p className="text-sm font-bold">AdMate 계정</p>
                      <p className="mt-0.5 text-xs font-medium text-slate-500">로그인됨</p>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <Link href="/account" className="block rounded-md px-3 py-2 text-sm font-semibold hover:bg-slate-50">
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
                className="inline-flex h-9 min-w-[68px] items-center justify-center rounded-[8px] bg-[#172033] px-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(16,24,32,0.12)] transition duration-300 hover:bg-[#273755] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#172033] focus-visible:ring-offset-2 sm:h-10 sm:min-w-[88px] sm:px-4"
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
