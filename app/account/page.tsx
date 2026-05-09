import Link from 'next/link';
import type { Metadata } from 'next';
import { FORESIGHT_ACCESS_REQUEST_URL } from '@/lib/auth/foresightAuth';

export const metadata: Metadata = {
  title: 'AdMate Foresight 계정',
  description: 'AdMate Foresight 계정과 접근 상태를 확인합니다.',
};

export default function AccountPage() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-10">
      <section className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-7">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            AF
          </div>
          <h1 className="text-2xl font-bold text-gray-950">AdMate 계정</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            접근 가능한 제품과 권한 상태를 확인합니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">로그인 상태</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">연결 대기</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-medium text-gray-500">Foresight 접근</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">확인 대기</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/login?next=%2Faccount"
            className="flex flex-1 items-center justify-center rounded-lg bg-gray-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            로그인
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
