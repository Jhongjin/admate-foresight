import Link from 'next/link';
import type { Metadata } from 'next';
import { FORESIGHT_RESET_PASSWORD_URL } from '@/lib/auth/foresightAuth';

export const metadata: Metadata = {
  title: 'AdMate Foresight 비밀번호 재설정',
  description: 'AdMate 계정의 비밀번호 재설정 경로를 안내합니다.',
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100dvh-9rem)] py-10">
      <section className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="foresight-panel rounded-2xl p-8 sm:p-10">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-800/10 bg-teal-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-900">
            계정 복구 안내
          </div>
          <h1 className="max-w-xl text-4xl font-black leading-[1.05] text-slate-950 sm:text-5xl">
            비밀번호 재설정
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600">
            AdMate 계정의 비밀번호를 재설정한 뒤 Foresight 성과 예측 화면으로 돌아와 접근 상태를 다시 확인하세요.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={FORESIGHT_RESET_PASSWORD_URL}
              className="group inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-teal-950 active:scale-[0.98]"
            >
              재설정 계속하기
              <span className="ml-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5">
                ↗
              </span>
            </a>
            <Link
              href="/login"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-stone-300 bg-white/70 px-5 py-3 text-sm font-bold text-slate-700 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-teal-700/30 hover:bg-white active:scale-[0.98]"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-stone-300/70 bg-[#101820] p-2 text-white shadow-[0_24px_70px_rgba(16,24,32,0.16)]">
          <div className="h-full rounded-[0.85rem] border border-white/10 bg-white/[0.04] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">재설정 절차</p>
            <div className="mt-6 grid gap-3">
              {[
                ['01단계', 'AdMate 계정 인증'],
                ['02단계', '새 비밀번호 설정'],
                ['03단계', 'Foresight 접근 재확인'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
