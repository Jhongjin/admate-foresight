import Link from 'next/link';
import type { Metadata } from 'next';
import {
  FORESIGHT_ACCESS_REQUEST_URL,
  sanitizeForesightNextPath,
} from '@/lib/auth/foresightAuth';

export const metadata: Metadata = {
  title: 'AdMate Foresight 로그인',
  description: '성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요',
};

interface LoginPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeForesightNextPath(params?.next);

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-10">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            AF
          </div>
          <h1 className="text-2xl font-bold text-gray-950">AdMate Foresight 로그인</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            성과 예측과 기준 데이터 검토를 이용하려면 AdMate 계정으로 로그인하세요
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center justify-center rounded-lg bg-gray-900 px-4 py-3 text-sm font-semibold text-white opacity-60"
          >
            AdMate 계정으로 계속
          </button>
          <p className="text-xs leading-5 text-gray-500">
            로그인 연결이 준비되면 현재 보려던 Foresight 화면으로 돌아갑니다.
          </p>
        </div>

        <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-xs font-medium text-gray-500">로그인 후 이동</p>
          <p className="mt-1 break-all text-sm font-semibold text-gray-800">{nextPath}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/reset-password"
            className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            비밀번호 재설정
          </Link>
          <a
            href={FORESIGHT_ACCESS_REQUEST_URL}
            className="flex flex-1 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
          >
            이용 신청
          </a>
        </div>
      </section>
    </div>
  );
}
