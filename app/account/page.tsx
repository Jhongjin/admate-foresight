import type { Metadata } from 'next';
import { requireForesightPageSession } from '@/lib/auth/foresightPageGuard';

export const metadata: Metadata = {
  title: 'AdMate Foresight 계정',
  description: 'AdMate Foresight 계정과 접근 상태를 확인합니다.',
};

export default async function AccountPage() {
  await requireForesightPageSession('/account');

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-3xl flex-col justify-center px-6 py-12">
      <section className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-indigo-700">AdMate Foresight</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-950">계정 접근 상태</h1>
        <p className="mt-4 text-sm leading-6 text-gray-600">
          현재 브라우저에는 AdMate Foresight 접근 세션이 활성화되어 있습니다.
        </p>
      </section>
    </div>
  );
}
