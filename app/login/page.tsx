import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getForesightLoginCopy,
  resolveForesightLoginState,
} from '@/lib/auth/foresightAccessCopy';
import {
  buildForesightCoreStartUrl,
  FORESIGHT_ACCESS_REQUEST_URL,
  sanitizeForesightNextPath,
} from '@/lib/auth/foresightAuth';
import { isForesightHandoffConfigured } from '@/lib/auth/foresightSession';

export const metadata: Metadata = {
  title: 'AdMate Foresight 로그인',
  description: 'AdMate Foresight에 접근하려면 AdMate 계정으로 로그인하세요.',
};

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function describeNextDestination(nextPath: string): string {
  const pathname = nextPath.split('?')[0];

  switch (pathname) {
    case '/trends':
      return '업종별 트렌드 화면으로 돌아갑니다.';
    case '/insights':
      return '시즌 인사이트 화면으로 돌아갑니다.';
    case '/competitor':
      return '경쟁사 모니터링 화면으로 돌아갑니다.';
    case '/account':
      return '계정 접근 상태 화면으로 돌아갑니다.';
    default:
      return '성과 예측 시뮬레이터로 돌아갑니다.';
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeForesightNextPath(params?.next);
  const nextDescription = describeNextDestination(nextPath);
  const loginState = resolveForesightLoginState(params);
  const loginCopy = getForesightLoginCopy(loginState);
  const coreStartUrl = isForesightHandoffConfigured()
    ? buildForesightCoreStartUrl(nextPath)
    : null;
  const primaryActionHref =
    loginState === 'handoff_disabled' ? FORESIGHT_ACCESS_REQUEST_URL : coreStartUrl;
  const noticeToneClass =
    loginCopy.noticeTone === 'danger' ? 'text-red-700' : 'text-stone-500';

  return (
    <div className="min-h-[calc(100dvh-9rem)] py-10">
      <section className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="foresight-panel relative overflow-hidden rounded-2xl p-8 sm:p-10">
          <div
            aria-hidden="true"
            className="absolute right-8 top-8 h-36 w-36 rounded-full border border-teal-700/10"
          />
          <div className="relative">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-teal-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-900">
              Foresight access desk
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.05] text-slate-950 sm:text-5xl">
              {loginCopy.title}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
              {loginCopy.body}
            </p>
          </div>

          <div className="relative mt-10 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            {primaryActionHref ? (
              <a
                href={primaryActionHref}
                className="group inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
              >
                <span>{loginCopy.primaryAction}</span>
                <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                  ↗
                </span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex min-h-12 cursor-not-allowed items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white opacity-55"
              >
                {loginCopy.primaryAction}
              </button>
            )}
            <Link
              href="/reset-password"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-stone-300 bg-white/70 px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-teal-700/30 hover:bg-white active:scale-[0.98]"
            >
              비밀번호 재설정
            </Link>
          </div>

          <div className="relative mt-5 space-y-2">
            <p className="text-xs leading-5 text-stone-500">
              {primaryActionHref ? loginCopy.helper : '로그인 연결이 아직 준비되지 않았습니다.'}
            </p>
            {loginCopy.notice ? (
              <p className={`text-xs leading-5 ${noticeToneClass}`}>
                {loginCopy.notice}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="rounded-2xl border border-stone-300/70 bg-[#101820] p-2 text-white shadow-[0_24px_70px_rgba(16,24,32,0.16)]">
          <div className="h-full rounded-[0.85rem] border border-white/10 bg-white/[0.04] p-6">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">로그인 후 이동</p>
                <p className="mt-2 text-lg font-bold">{nextDescription}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-teal-200/30 bg-teal-200/10 text-xs font-black text-teal-100">
                AF
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {[
                ['Session', isForesightHandoffConfigured() ? 'handoff ready' : 'request gate'],
                ['Scope', 'forecast workspace'],
                ['Access', loginState === 'handoff_disabled' ? 'manual review' : 'AdMate account'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
            <a
              href={FORESIGHT_ACCESS_REQUEST_URL}
              className="mt-6 inline-flex w-full items-center justify-between rounded-full border border-amber-200/30 bg-amber-100/10 px-5 py-3 text-sm font-bold text-amber-100 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-amber-100/15 active:scale-[0.98]"
            >
              이용 신청
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}
