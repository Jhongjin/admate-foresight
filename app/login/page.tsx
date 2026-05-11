import Link from 'next/link';
import type { Metadata } from 'next';
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

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeForesightNextPath(params?.next);
  const coreStartUrl = isForesightHandoffConfigured()
    ? buildForesightCoreStartUrl(nextPath)
    : null;
  const handoffStatus = Array.isArray(params?.handoff) ? params?.handoff[0] : params?.handoff;

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-10">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            AF
          </div>
          <h1 className="text-2xl font-bold text-gray-950">AdMate Foresight 로그인</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요.
          </p>
        </div>

        <div className="space-y-3">
          {coreStartUrl ? (
            <a
              href={coreStartUrl}
              className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              AdMate 계정으로 계속
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white opacity-60"
            >
              AdMate 계정으로 계속
            </button>
          )}
          <p className="text-xs leading-5 text-gray-500">
            {coreStartUrl
              ? 'AdMate 로그인 후 요청한 Foresight 화면으로 돌아갑니다.'
              : '로그인 연결이 아직 준비되지 않았습니다.'}
          </p>
          {handoffStatus === 'expired' ? (
            <p className="text-xs leading-5 text-red-600">
              로그인 확인이 만료되었습니다. 다시 로그인해 주세요.
            </p>
          ) : null}
          {handoffStatus === 'invalid' ? (
            <p className="text-xs leading-5 text-red-600">
              로그인 연결을 완료할 수 없습니다. 다시 시도해 주세요.
            </p>
          ) : null}
          {handoffStatus === 'disabled' ? (
            <p className="text-xs leading-5 text-red-600">
              로그인 연결이 아직 준비되지 않았습니다.
            </p>
          ) : null}
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500">로그인 후 이동</p>
          <p className="mt-1 break-all text-sm font-semibold text-gray-800">{nextPath}</p>
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
