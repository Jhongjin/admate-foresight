import Link from 'next/link';
import type { Metadata } from 'next';
import { FORESIGHT_RESET_PASSWORD_URL } from '@/lib/auth/foresightAuth';

export const metadata: Metadata = {
  title: 'AdMate Foresight 비밀번호 재설정',
  description: 'AdMate 계정의 비밀번호 재설정 경로를 안내합니다.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-10">
      <section className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-7">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
            AF
          </div>
          <h1 className="text-2xl font-bold text-gray-950">비밀번호 재설정</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            AdMate 계정의 비밀번호를 재설정한 뒤 AdMate Foresight로 돌아와 로그인하세요.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <a
            href={FORESIGHT_RESET_PASSWORD_URL}
            className="flex flex-1 items-center justify-center rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            재설정 계속하기
          </a>
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </section>
    </div>
  );
}
