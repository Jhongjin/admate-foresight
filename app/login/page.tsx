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
    loginCopy.noticeTone === 'danger' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-10">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            AF
          </div>
          <h1 className="text-2xl font-bold text-gray-950">{loginCopy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {loginCopy.body}
          </p>
        </div>

        <div className="space-y-3">
          {primaryActionHref ? (
            <a
              href={primaryActionHref}
              className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              {loginCopy.primaryAction}
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white opacity-60"
            >
              {loginCopy.primaryAction}
            </button>
          )}
          <p className="text-xs leading-5 text-gray-500">
            {primaryActionHref ? loginCopy.helper : '로그인 연결이 아직 준비되지 않았습니다.'}
          </p>
          {loginCopy.notice ? (
            <p className={`text-xs leading-5 ${noticeToneClass}`}>
              {loginCopy.notice}
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500">로그인 후 이동</p>
          <p className="mt-1 text-sm font-semibold text-gray-800">{nextDescription}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/reset-password"
            className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            비밀번호 재설정
          </Link>
          <a
            href={FORESIGHT_ACCESS_REQUEST_URL}
            className="flex flex-1 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            이용 신청
          </a>
        </div>
      </section>
    </div>
  );
}
